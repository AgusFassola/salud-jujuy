// =========================================================
// PEGA AQUÍ TUS DOS LLAVES DE SUPABASE (PASO 1)
// =========================================================
const SUPABASE_URL = 'https://wgeiyzidrhmgakzvswtr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3Ndq5Da1JEbpI7y7VzupGw_WR_abOHN';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todosLosProfesionales = [];
let horarioSeleccionado = 'manana'; // Por defecto mañana como pediste
let turnoSeleccionado = null;

// Cargar datos al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
  cargarProfesionales();

  // Escuchar cambios en todos los filtros
  document.getElementById('filtro-especialidad').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-obra').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-barrio').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-lugar').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-precio').addEventListener('input', (e) => {
    document.getElementById('precio-valor').textContent = `$${Number(e.target.value).toLocaleString('es-AR')}`;
    aplicarFiltros();
  });

  // Formulario de alta de profesional
  document.getElementById('form-profesional').addEventListener('submit', registrarProfesional);
});

async function cargarProfesionales() {
  const { data, error } = await db.from('profesionales').select('*');
  if (error) {
    console.error('Error cargando BD:', error);
    document.getElementById('contador-resultados').textContent = 'Error conectando con Supabase. Revisa las claves en app.js';
    return;
  }
  todosLosProfesionales = data;
  aplicarFiltros();
}

function setHorario(horario) {
  horarioSeleccionado = horario;
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  if (horario === 'manana') document.getElementById('btn-manana').classList.add('active');
  if (horario === 'tarde') document.getElementById('btn-tarde').classList.add('active');
  if (horario === 'todos') document.getElementById('btn-todos-horarios').classList.add('active');
  aplicarFiltros();
}

function aplicarFiltros() {
  const esp = document.getElementById('filtro-especialidad').value;
  const obra = document.getElementById('filtro-obra').value;
  const barrio = document.getElementById('filtro-barrio').value;
  const lugar = document.getElementById('filtro-lugar').value;
  const precioMax = Number(document.getElementById('filtro-precio').value);

  const filtrados = todosLosProfesionales.filter(pro => {
    const okEsp = !esp || pro.especialidad === esp;
    const okObra = !obra || (pro.obras_sociales && pro.obras_sociales.includes(obra));
    const okBarrio = !barrio || pro.barrio === barrio;
    const okLugar = !lugar || pro.lugar_tipo === lugar;
    const okPrecio = pro.precio <= precioMax;

    let okHorario = true;
    if (horarioSeleccionado === 'manana') okHorario = pro.turnos_manana && pro.turnos_manana.length > 0;
    if (horarioSeleccionado === 'tarde') okHorario = pro.turnos_tarde && pro.turnos_tarde.length > 0;

    return okEsp && okObra && okBarrio && okLugar && okPrecio && okHorario;
  });

  renderizarTarjetas(filtrados);
}

function renderizarTarjetas(lista) {
  const contenedor = document.getElementById('lista-profesionales');
  document.getElementById('contador-resultados').textContent = `${lista.length} Profesional(es) disponible(s) en San Salvador`;

  if (lista.length === 0) {
    contenedor.innerHTML = `<div class="pro-card"><p>No hay profesionales con esa combinación exacta. Probá ampliar el barrio o limpiar filtros.</p></div>`;
    return;
  }

  contenedor.innerHTML = lista.map(pro => {
    let turnosAMostrar = [];
    if (horarioSeleccionado === 'manana') turnosAMostrar = pro.turnos_manana || [];
    else if (horarioSeleccionado === 'tarde') turnosAMostrar = pro.turnos_tarde || [];
    else turnosAMostrar = [...(pro.turnos_manana || []), ...(pro.turnos_tarde || [])];

    return `
      <article class="pro-card">
        <div class="pro-info">
          <div>
            <h3>${pro.nombre} <span class="badge-esp">${pro.especialidad}</span></h3>
          </div>
          <p class="pro-meta">🏥 <strong>${pro.lugar_nombre}</strong> (${pro.lugar_tipo})</p>
          <p class="pro-ref">📍 Barrio ${pro.barrio} — ${pro.referencia}</p>
          <div class="obras-list">
            ${(pro.obras_sociales || []).map(os => `<span class="obra-tag">${os}</span>`).join('')}
          </div>
        </div>

        <div class="pro-turnos">
          <div>
            <span class="precio-label">Consulta Particular</span>
            <span class="precio-box">$${pro.precio.toLocaleString('es-AR')}</span>
          </div>
          <div class="slots-container">
            <span class="slots-title">Turnos disponibles (${horarioSeleccionado}):</span>
            <div class="slots-buttons">
              ${turnosAMostrar.map(hora => `
                <button class="btn-slot" onclick="abrirModal('${pro.nombre}', '${pro.especialidad}', '${hora}')">
                  ${hora} hs
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function limpiarFiltros() {
  document.getElementById('filtro-especialidad').value = '';
  document.getElementById('filtro-obra').value = '';
  document.getElementById('filtro-barrio').value = '';
  document.getElementById('filtro-lugar').value = '';
  document.getElementById('filtro-precio').value = 30000;
  document.getElementById('precio-valor').textContent = '$30.000';
  setHorario('todos');
}

// Cambio entre Paciente y Profesional
function cambiarVista(vista) {
  if (vista === 'paciente') {
    document.getElementById('vista-paciente').classList.remove('hidden');
    document.getElementById('vista-profesional').classList.add('hidden');
    document.getElementById('btn-modo-paciente').classList.add('active');
    document.getElementById('btn-modo-profesional').classList.remove('active');
  } else {
    document.getElementById('vista-paciente').classList.add('hidden');
    document.getElementById('vista-profesional').classList.remove('hidden');
    document.getElementById('btn-modo-paciente').classList.remove('active');
    document.getElementById('btn-modo-profesional').classList.add('active');
  }
}

// Registrar nuevo profesional en Supabase en tiempo real
async function registrarProfesional(e) {
  e.preventDefault();
  const obrasChecked = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value);

  const nuevoPro = {
    nombre: document.getElementById('reg-nombre').value,
    especialidad: document.getElementById('reg-especialidad').value,
    lugar_tipo: document.getElementById('reg-lugar-tipo').value,
    lugar_nombre: document.getElementById('reg-lugar-nombre').value,
    barrio: document.getElementById('reg-barrio').value,
    referencia: document.getElementById('reg-referencia').value,
    obras_sociales: obrasChecked,
    precio: Number(document.getElementById('reg-precio').value),
    turnos_manana: ['09:00', '10:30'],
    turnos_tarde: ['17:00']
  };

  const { error } = await db.from('profesionales').insert([nuevoPro]);

  if (error) {
    alert('Error al guardar: ' + error.message);
  } else {
    alert('¡Perfil publicado con éxito en la base de datos! Ya podés verlo en el buscador.');
    document.getElementById('form-profesional').reset();
    await cargarProfesionales();
    cambiarVista('paciente');
    limpiarFiltros();
  }
}

// Modal de turnos
let turnoActual = {};

function abrirModal(nombre, esp, hora) {
  turnoActual = { nombre, esp, hora };
  document.getElementById('modal-info').innerHTML = `
    <strong>Profesional:</strong> ${nombre}<br>
    <strong>Especialidad:</strong> ${esp}<br>
    <strong>Horario seleccionado:</strong> ${hora} hs
  `;
  document.getElementById('modal-turno').classList.remove('hidden');
}

function cerrarModal() {
  document.getElementById('modal-turno').classList.add('hidden');
  document.getElementById('paciente-nombre').value = '';
  document.getElementById('paciente-dni').value = '';
}

async function confirmarReserva() {
  const pacNombre = document.getElementById('paciente-nombre').value.trim();
  const pacDni = document.getElementById('paciente-dni').value.trim();

  if (!pacNombre || !pacDni) {
    return alert('Por favor completá tu nombre y DNI / N° de afiliado ISJ.');
  }

  const { error } = await db.from('turnos_reservados').insert([{
    profesional_nombre: turnoActual.nombre,
    especialidad: turnoActual.esp,
    horario: turnoActual.hora,
    paciente_nombre: pacNombre,
    paciente_dni: pacDni
  }]);

  if (error) {
    alert('Hubo un error al registrar el turno: ' + error.message);
  } else {
    alert(`✅ ¡Turno confirmado y guardado en sistema!\n\nPaciente: ${pacNombre}\nProfesional: ${turnoActual.nombre}\nHorario: ${turnoActual.hora} hs`);
    cerrarModal();
  }
}