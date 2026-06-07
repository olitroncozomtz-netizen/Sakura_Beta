const topVistosConfig = [
  { nombre: "Sword Art Online", temporada: 2 },
  { nombre: "Chainsaw Man",     temporada: 1 },
  { nombre: "Sword Art Online", temporada: 0 },
  { nombre: "Class de 2-ban Me ni Kawaii Onna no Ko to Tomodachi ni Natta" },
  { nombre: "Chainsaw Man",     temporada: 0 },
  { nombre: "Ranma1/2",     temporada: 1 },
  { nombre: "Kaguya-sama: Love Is War", temporada: 0 },
  { nombre: "DARLING in the FRANXX",     temporada: 0 },
];

function getTopVistos() {
  if (typeof catalogoFlat === 'undefined' || catalogoFlat.length === 0) return [];
  if (!topVistosConfig || topVistosConfig.length === 0) return catalogoFlat.slice(0, 8);

  const resultado = [];

  topVistosConfig.forEach(cfg => {
    const nombreBuscado = cfg.nombre.trim().toLowerCase();
    const tIdx = cfg.temporada !== undefined ? cfg.temporada : null;

    const entry = catalogoFlat.find(e => {
      const ref = e._serieRef || e;
      const nombreRaiz = ref.Nombre.trim().toLowerCase();

      if (nombreRaiz !== nombreBuscado) return false;

      if (ref.temporadas && ref.temporadas.length > 0) {
        const idxEsperado = tIdx !== null ? tIdx : 0;
        return e._temporadaIdx === idxEsperado;
      }
      return true;
    });

    if (entry) resultado.push(entry);
  });

  return resultado;
}
