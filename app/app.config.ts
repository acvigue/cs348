export default defineAppConfig({
  ui: {
    colors: {
      primary: 'pink',
      neutral: 'slate'
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
