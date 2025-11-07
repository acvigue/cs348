export default defineAppConfig({
  ui: {
    colors: {
      primary: 'purple',
      neutral: 'gray'
    },
    formField: {
      slots: {
        container: 'mt-1 relative w-full'
      }
    },
    input: {
      slots: {
        root: 'w-full'
      }
    }
  },
  public: {
    siteName: 'Lab Scheduling App'
  }
})
