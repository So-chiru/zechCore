const save = (key, value) => {
  return sessionStorage.setItem(`zechCore.${key}`);
}

const load = (key) => {
  return sessionStorage.getItem(`zechCore.${key}`)
}

module.exports = {
  save,
  load
}