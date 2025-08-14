let memoria = { apuestas: [], resultados: [] };

export async function guardarApuesta(apuesta) { memoria.apuestas.push(apuesta); }
export async function guardarResultado(resultado) { memoria.resultados.push(resultado); }
export async function obtenerTodo() { return memoria; }
