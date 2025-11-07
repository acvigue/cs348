import { PrismaClient } from '../app/generated/prisma/client'

const prisma = new PrismaClient()

// Helper function to generate random date within a range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// Helper function to generate random time slot (9 AM - 5 PM)
function randomTimeSlot(date: Date): { start: Date; end: Date } {
  const startHour = 9 + Math.floor(Math.random() * 7) // 9 AM to 3 PM
  const duration = 1 + Math.floor(Math.random() * 3) // 1-3 hours
  const start = new Date(date)
  start.setHours(startHour, 0, 0, 0)
  const end = new Date(start)
  end.setHours(startHour + duration, 0, 0, 0)
  return { start, end }
}

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create 10 Labs
  const labBuildings = [
    'Engineering Building A',
    'Engineering Building B',
    'Engineering Building C',
    'Science Building',
    'Research Center'
  ]
  const labDescriptions = [
    'General Electronics Laboratory with basic measurement equipment',
    'RF and Microwave Laboratory with high-frequency test equipment',
    'Materials Testing Laboratory with mechanical testing equipment',
    'Optics and Photonics Laboratory with laser and optical equipment',
    'Digital Systems Laboratory with computers and development boards',
    'Advanced Communications Laboratory with network testing equipment',
    'Control Systems Laboratory with robotics and automation equipment',
    'Power Electronics Laboratory with high-voltage testing equipment',
    'Biomedical Engineering Laboratory with medical device testing equipment',
    'Nanotechnology Laboratory with precision measurement instruments'
  ]

  const labs = []
  for (let i = 0; i < 10; i++) {
    const building = labBuildings[i % labBuildings.length]
    const roomNumber = String(100 + i * 10 + (i % 3))
    const capacity = 15 + Math.floor(Math.random() * 25) // 15-40 capacity
    labs.push(
      await prisma.lab.create({
        data: {
          building,
          roomNumber,
          capacity,
          description: labDescriptions[i]
        }
      })
    )
  }

  console.log(`✅ Created ${labs.length} labs`)

  // Create 100 Equipment items
  const equipmentTypes = [
    {
      name: 'Digital Oscilloscope',
      type: 'Measurement',
      description: 'High-bandwidth oscilloscope for signal analysis'
    },
    {
      name: 'Function Generator',
      type: 'Signal Generation',
      description: 'Arbitrary waveform generator'
    },
    {
      name: 'Spectrum Analyzer',
      type: 'RF Measurement',
      description: 'Frequency domain signal analyzer'
    },
    {
      name: 'Vector Network Analyzer',
      type: 'RF Measurement',
      description: 'S-parameter measurement system'
    },
    {
      name: 'Logic Analyzer',
      type: 'Digital Measurement',
      description: 'Multi-channel digital signal analyzer'
    },
    { name: 'DC Power Supply', type: 'Power', description: 'Programmable DC power source' },
    {
      name: 'Digital Multimeter',
      type: 'Measurement',
      description: 'Precision multimeter with data logging'
    },
    { name: 'Signal Generator', type: 'Signal Generation', description: 'RF signal source' },
    {
      name: 'Protocol Analyzer',
      type: 'Digital Measurement',
      description: 'Protocol analysis and debugging tool'
    },
    { name: '3D Printer', type: 'Manufacturing', description: 'FDM 3D printing system' },
    {
      name: 'Laser System',
      type: 'Laser',
      description: 'Precision laser for research applications'
    },
    { name: 'Microscope', type: 'Imaging', description: 'High-resolution imaging system' },
    {
      name: 'FPGA Development Board',
      type: 'Development Hardware',
      description: 'FPGA prototyping platform'
    },
    {
      name: 'Embedded Development Kit',
      type: 'Development Hardware',
      description: 'MCU development ecosystem'
    },
    {
      name: 'Universal Testing Machine',
      type: 'Mechanical Testing',
      description: 'Material stress-strain testing'
    },
    {
      name: 'Hardness Tester',
      type: 'Material Analysis',
      description: 'Material hardness measurement'
    },
    { name: 'Thermal Camera', type: 'Imaging', description: 'Infrared thermal imaging camera' },
    { name: 'LCR Meter', type: 'Measurement', description: 'Impedance measurement system' },
    {
      name: 'Temperature Chamber',
      type: 'Environmental Testing',
      description: 'Environmental testing chamber'
    },
    { name: 'Soldering Station', type: 'Assembly', description: 'Precision soldering equipment' }
  ]

  const equipment = []
  const statuses = [
    'OPERATIONAL',
    'OPERATIONAL',
    'OPERATIONAL',
    'OPERATIONAL',
    'MAINTENANCE',
    'OUT_OF_ORDER'
  ]

  for (let i = 0; i < 100; i++) {
    const template = equipmentTypes[i % equipmentTypes.length]
    const labId = labs[i % 10].id
    const serialPrefix = template.type.substring(0, 3).toUpperCase()
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    equipment.push(
      await prisma.equipment.create({
        data: {
          name: `${template.name} ${Math.floor(i / equipmentTypes.length) + 1}`,
          type: template.type,
          serialNumber: `${serialPrefix}-${String(i + 1).padStart(4, '0')}`,
          status,
          description: template.description,
          labId
        }
      })
    )
  }

  console.log(`✅ Created ${equipment.length} equipment items`)

  // Create 20 Users (1 admin, 3 instructors, 16 students)
  const firstNames = [
    'Alice',
    'Bob',
    'Charlie',
    'Diana',
    'Ethan',
    'Fiona',
    'George',
    'Hannah',
    'Ian',
    'Julia',
    'Kevin',
    'Laura',
    'Michael',
    'Nina',
    'Oscar',
    'Paula',
    'Quinn',
    'Rachel',
    'Sam',
    'Tina'
  ]
  const lastNames = [
    'Johnson',
    'Smith',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Hernandez',
    'Lopez',
    'Gonzalez',
    'Wilson',
    'Anderson',
    'Thomas',
    'Taylor',
    'Moore',
    'Jackson',
    'Martin'
  ]

  const users = []

  // Admin user
  users.push(
    await prisma.user.upsert({
      where: { email: 'admin@lab.edu' },
      update: {},
      create: {
        email: 'admin@lab.edu',
        password: '$2a$12$p868jVafX1XK0MI/cG9V1O7R4x7j0JW1MWNqTKCCGvStKydZkxXDm',
        name: 'Lab Administrator',
        role: 'ADMIN'
      }
    })
  )

  // Instructor users
  for (let i = 0; i < 3; i++) {
    users.push(
      await prisma.user.upsert({
        where: { email: `instructor${i + 1}@lab.edu` },
        update: {},
        create: {
          email: `instructor${i + 1}@lab.edu`,
          password: '$2a$12$p868jVafX1XK0MI/cG9V1O7R4x7j0JW1MWNqTKCCGvStKydZkxXDm',
          name: `${firstNames[i]} ${lastNames[i]}`,
          role: 'INSTRUCTOR'
        }
      })
    )
  }

  // Student users
  for (let i = 0; i < 16; i++) {
    users.push(
      await prisma.user.upsert({
        where: { email: `student${i + 1}@lab.edu` },
        update: {},
        create: {
          email: `student${i + 1}@lab.edu`,
          password: '$2a$12$p868jVafX1XK0MI/cG9V1O7R4x7j0JW1MWNqTKCCGvStKydZkxXDm',
          name: `${firstNames[i + 3]} ${lastNames[i + 3]}`,
          role: 'STUDENT'
        }
      })
    )
  }

  console.log(`✅ Created ${users.length} users (1 admin, 3 instructors, 16 students)`)

  // Create reservations: 60 days of history + 14 days of future events
  const reservationPurposes = [
    'Circuit Analysis Lab Assignment',
    'RF Filter Design Project',
    'Materials Characterization Experiment',
    'Digital Signal Processing Lab',
    'Power Electronics Testing',
    'Embedded Systems Project',
    'Optical Communication Research',
    'Microcontroller Programming',
    'Network Protocol Analysis',
    'Sensor Calibration',
    'PCB Testing and Debugging',
    'Antenna Design Verification',
    'Control Systems Lab',
    'FPGA Implementation',
    'Thermal Analysis Study',
    'Signal Integrity Testing',
    'Data Acquisition Setup',
    'Prototype Manufacturing',
    'Senior Capstone Project',
    'Research Experiment'
  ]

  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - 60) // 60 days ago
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 14) // 14 days in the future

  const reservations = []
  const studentUsers = users.filter((u) => u.role === 'STUDENT')

  // Generate historical reservations (60 days back) - all CONFIRMED (completed)
  for (let i = 0; i < 200; i++) {
    const reservationDate = randomDate(startDate, now)
    const { start, end } = randomTimeSlot(reservationDate)
    const user = studentUsers[Math.floor(Math.random() * studentUsers.length)]
    const purpose = reservationPurposes[Math.floor(Math.random() * reservationPurposes.length)]

    const reservation = await prisma.reservation.create({
      data: {
        userId: user.id,
        startTime: start,
        endTime: end,
        purpose,
        status: 'CONFIRMED',
        notes: `Historical reservation - completed on ${start.toLocaleDateString()}`
      }
    })
    reservations.push(reservation)

    // Add 1-3 equipment items to each reservation
    const numEquipment = 1 + Math.floor(Math.random() * 3)
    const availableEquipment = equipment.filter((e) => e.status === 'OPERATIONAL')
    const selectedEquipment = []
    for (let j = 0; j < numEquipment; j++) {
      const eq = availableEquipment[Math.floor(Math.random() * availableEquipment.length)]
      if (!selectedEquipment.includes(eq.id)) {
        selectedEquipment.push(eq.id)
        await prisma.reservationEquipment.create({
          data: {
            reservationId: reservation.id,
            equipmentId: eq.id
          }
        })
      }
    }
  }

  console.log(`✅ Created ${reservations.length} historical reservations`)

  // Generate future reservations (14 days forward) - mix of CONFIRMED and PENDING
  const futureReservationCount = 80
  for (let i = 0; i < futureReservationCount; i++) {
    const reservationDate = randomDate(now, endDate)
    const { start, end } = randomTimeSlot(reservationDate)
    const user = studentUsers[Math.floor(Math.random() * studentUsers.length)]
    const purpose = reservationPurposes[Math.floor(Math.random() * reservationPurposes.length)]

    // 60% confirmed, 40% pending
    const status = Math.random() < 0.6 ? 'CONFIRMED' : 'PENDING'

    const reservation = await prisma.reservation.create({
      data: {
        userId: user.id,
        startTime: start,
        endTime: end,
        purpose,
        status,
        notes: status === 'PENDING' ? 'Awaiting approval' : 'Approved and scheduled'
      }
    })
    reservations.push(reservation)

    // Add 1-3 equipment items to each reservation
    const numEquipment = 1 + Math.floor(Math.random() * 3)
    const availableEquipment = equipment.filter((e) => e.status === 'OPERATIONAL')
    const selectedEquipment = []
    for (let j = 0; j < numEquipment; j++) {
      const eq = availableEquipment[Math.floor(Math.random() * availableEquipment.length)]
      if (!selectedEquipment.includes(eq.id)) {
        selectedEquipment.push(eq.id)
        await prisma.reservationEquipment.create({
          data: {
            reservationId: reservation.id,
            equipmentId: eq.id
          }
        })
      }
    }
  }

  console.log(`✅ Created ${futureReservationCount} future reservations (confirmed and pending)`)
  console.log(`📊 Total reservations: ${reservations.length}`)
  console.log('🎉 Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
