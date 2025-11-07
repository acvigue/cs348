import { PrismaClient } from '../app/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create Labs
  const labs = await Promise.all([
    prisma.lab.create({
      data: {
        building: 'Engineering Building A',
        roomNumber: '101',
        capacity: 30,
        description: 'General Electronics Laboratory with basic measurement equipment'
      }
    }),
    prisma.lab.create({
      data: {
        building: 'Engineering Building A',
        roomNumber: '201',
        capacity: 25,
        description: 'RF and Microwave Laboratory with high-frequency test equipment'
      }
    }),
    prisma.lab.create({
      data: {
        building: 'Engineering Building B',
        roomNumber: '105',
        capacity: 20,
        description: 'Materials Testing Laboratory with mechanical testing equipment'
      }
    }),
    prisma.lab.create({
      data: {
        building: 'Engineering Building B',
        roomNumber: '203',
        capacity: 15,
        description: 'Optics and Photonics Laboratory with laser and optical equipment'
      }
    }),
    prisma.lab.create({
      data: {
        building: 'Engineering Building C',
        roomNumber: '150',
        capacity: 35,
        description: 'Digital Systems Laboratory with computers and development boards'
      }
    })
  ])

  console.log(`✅ Created ${labs.length} labs`)

  // Create Equipment for each lab
  const equipment = await Promise.all([
    // Electronics Lab Equipment
    prisma.equipment.create({
      data: {
        name: 'Digital Oscilloscope',
        type: 'Measurement',
        serialNumber: 'OSC-001',
        status: 'AVAILABLE',
        description: 'Tektronix MSO64 4-channel oscilloscope, 1 GHz bandwidth',
        labId: labs[0].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'Function Generator',
        type: 'Signal Generation',
        serialNumber: 'FG-001',
        status: 'AVAILABLE',
        description: 'Keysight 33500B series waveform generator, 30 MHz',
        labId: labs[0].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'Digital Multimeter',
        type: 'Measurement',
        serialNumber: 'DMM-001',
        status: 'AVAILABLE',
        description: 'Fluke 87V industrial multimeter with temperature probe',
        labId: labs[0].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'DC Power Supply',
        type: 'Power',
        serialNumber: 'PS-001',
        status: 'AVAILABLE',
        description: 'Keysight E3631A triple output DC power supply',
        labId: labs[0].id
      }
    }),

    // RF Lab Equipment
    prisma.equipment.create({
      data: {
        name: 'Spectrum Analyzer',
        type: 'RF Measurement',
        serialNumber: 'SA-001',
        status: 'AVAILABLE',
        description: 'Rohde & Schwarz FSW signal analyzer, 50 GHz',
        labId: labs[1].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'Vector Network Analyzer',
        type: 'RF Measurement',
        serialNumber: 'VNA-001',
        status: 'AVAILABLE',
        description: 'Keysight E5071C 4-port VNA, 20 GHz',
        labId: labs[1].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'Signal Generator',
        type: 'RF Signal Generation',
        serialNumber: 'SG-001',
        status: 'AVAILABLE',
        description: 'Rohde & Schwarz SMW200A vector signal generator, 20 GHz',
        labId: labs[1].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'RF Power Meter',
        type: 'RF Measurement',
        serialNumber: 'PM-001',
        status: 'MAINTENANCE',
        description: 'Keysight E4417A EPM-P series power meter with sensor',
        labId: labs[1].id
      }
    }),

    // Materials Lab Equipment
    prisma.equipment.create({
      data: {
        name: 'Universal Testing Machine',
        type: 'Mechanical Testing',
        serialNumber: 'UTM-001',
        status: 'AVAILABLE',
        description: 'Instron 5985 universal testing system, 250 kN capacity',
        labId: labs[2].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'Hardness Tester',
        type: 'Material Analysis',
        serialNumber: 'HT-001',
        status: 'AVAILABLE',
        description: 'Wilson VH3300 Vickers hardness tester',
        labId: labs[2].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'Fatigue Testing Machine',
        type: 'Mechanical Testing',
        serialNumber: 'FTM-001',
        status: 'OUT_OF_ORDER',
        description: 'MTS 810 servo-hydraulic fatigue testing system',
        labId: labs[2].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'Microscope',
        type: 'Imaging',
        serialNumber: 'MIC-001',
        status: 'AVAILABLE',
        description: 'Olympus BX53M metallurgical microscope with camera',
        labId: labs[2].id
      }
    }),

    // Optics Lab Equipment
    prisma.equipment.create({
      data: {
        name: 'Laser System',
        type: 'Laser',
        serialNumber: 'LAS-001',
        status: 'AVAILABLE',
        description: 'Coherent Verdi V-18 DPSS laser, 532 nm, 18W',
        labId: labs[3].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'Optical Spectrum Analyzer',
        type: 'Optical Measurement',
        serialNumber: 'OSA-001',
        status: 'AVAILABLE',
        description: 'Yokogawa AQ6370D optical spectrum analyzer, 1200-2400 nm',
        labId: labs[3].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'Beam Profiler',
        type: 'Optical Measurement',
        serialNumber: 'BP-001',
        status: 'AVAILABLE',
        description: 'Thorlabs BC106N-VIS beam profiler camera',
        labId: labs[3].id
      }
    }),

    // Digital Systems Lab Equipment
    prisma.equipment.create({
      data: {
        name: 'FPGA Development Board',
        type: 'Development Hardware',
        serialNumber: 'FPGA-001',
        status: 'AVAILABLE',
        description: 'Xilinx Zynq UltraScale+ ZCU102 evaluation kit',
        labId: labs[4].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'Logic Analyzer',
        type: 'Digital Measurement',
        serialNumber: 'LA-001',
        status: 'AVAILABLE',
        description: 'Keysight 16902B logic analyzer with 68 channels',
        labId: labs[4].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'Embedded Development Kit',
        type: 'Development Hardware',
        serialNumber: 'EDK-001',
        status: 'IN_USE',
        description: 'STM32 Nucleo development ecosystem with various boards',
        labId: labs[4].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: 'Protocol Analyzer',
        type: 'Digital Measurement',
        serialNumber: 'PA-001',
        status: 'AVAILABLE',
        description: 'Keysight U4431A USB 3.0 protocol analyzer',
        labId: labs[4].id
      }
    }),
    prisma.equipment.create({
      data: {
        name: '3D Printer',
        type: 'Manufacturing',
        serialNumber: '3DP-001',
        status: 'AVAILABLE',
        description: 'Ultimaker S5 professional 3D printer with dual extrusion',
        labId: labs[4].id
      }
    })
  ])

  console.log(`✅ Created ${equipment.length} equipment items`)

  // Create a sample admin user if it doesn't exist
  await prisma.user.upsert({
    where: { email: 'admin@lab.edu' },
    update: {},
    create: {
      email: 'admin@lab.edu',
      password: '$2b$10$K7L/8Y1t85haFj/xi.LjauSBjXinbn9IP.TtSfIm/16trCV4otopK', // 'password123'
      name: 'Lab Administrator',
      role: 'ADMIN'
    }
  })

  // Create sample student users
  const studentUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'student1@lab.edu' },
      update: {},
      create: {
        email: 'student1@lab.edu',
        password: '$2b$10$K7L/8Y1t85haFj/xi.LjauSBjXinbn9IP.TtSfIm/16trCV4otopK', // 'password123'
        name: 'Alice Johnson',
        role: 'STUDENT'
      }
    }),
    prisma.user.upsert({
      where: { email: 'student2@lab.edu' },
      update: {},
      create: {
        email: 'student2@lab.edu',
        password: '$2b$10$K7L/8Y1t85haFj/xi.LjauSBjXinbn9IP.TtSfIm/16trCV4otopK', // 'password123'
        name: 'Bob Smith',
        role: 'STUDENT'
      }
    })
  ])

  console.log(`✅ Created admin user and ${studentUsers.length} student users`)

  // Create some sample reservations
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const reservations = await Promise.all([
    prisma.reservation.create({
      data: {
        userId: studentUsers[0].id,
        startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(12, 0, 0, 0)),
        purpose: 'Circuit Analysis Lab Assignment',
        status: 'CONFIRMED',
        notes: 'Need to measure AC/DC characteristics of amplifier circuit'
      }
    }),
    prisma.reservation.create({
      data: {
        userId: studentUsers[1].id,
        startTime: new Date(nextWeek.setHours(14, 0, 0, 0)),
        endTime: new Date(nextWeek.setHours(16, 0, 0, 0)),
        purpose: 'RF Filter Design Project',
        status: 'PENDING',
        notes: 'Testing bandpass filter frequency response'
      }
    })
  ])

  // Link equipment to reservations via ReservationEquipment
  await prisma.reservationEquipment.create({
    data: {
      reservationId: reservations[0].id,
      equipmentId: equipment[0].id // Digital Oscilloscope
    }
  })
  await prisma.reservationEquipment.create({
    data: {
      reservationId: reservations[1].id,
      equipmentId: equipment[4].id // Spectrum Analyzer
    }
  })

  console.log(`✅ Created ${reservations.length} sample reservations`)
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
