self.addEventListener('fetch', (ev) => {
  if (!ev.request.url.indexOf('zech_core')) return false

  console.log(ev)
})