// =========================================================
// PEGA AQUÍ TUS DOS LLAVES DE SUPABASE (PASO 1)
// =========================================================
const SUPABASE_URL = 'https://wgeiyzidrhmgakzvswtr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3Ndq5Da1JEbpI7y7VzupGw_WR_abOHN';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todosLosProfesionales = [];
let horarioSeleccionado = 'todos'; // Por defecto mañana como pediste
let turnoSeleccionado = null;

// Cargar datos al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
  cargarProfesionales();
  cargarTurnosReservados();

  // Escuchar cambios en todos los filtros
  document.getElementById('filtro-especialidad').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-obra').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-barrio').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-lugar').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-nombre').addEventListener('input', aplicarFiltros);
  document.getElementById('activar-precio').addEventListener('change', (e) => {
  document.getElementById('contenedor-rango-precio').classList.toggle('hidden', !e.target.checked);
    aplicarFiltros();
  });
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
  const nombreBusqueda = document.getElementById('filtro-nombre').value.trim().toLowerCase();
  const limitarPrecio = document.getElementById('activar-precio').checked;

  const filtrados = todosLosProfesionales.filter(pro => {
    const okEsp = !esp || pro.especialidad === esp;
    const okObra = !obra || (pro.obras_sociales && pro.obras_sociales.includes(obra));
    const okBarrio = !barrio || pro.barrio === barrio;
    const okLugar = !lugar || pro.lugar_tipo === lugar;
    //const okPrecio = pro.precio <= precioMax;
    const okNombre = !nombreBusqueda || pro.nombre.toLowerCase().includes(nombreBusqueda);
    const okPrecio = !limitarPrecio || pro.precio <= precioMax;

    let okHorario = true;
    if (horarioSeleccionado === 'manana') okHorario = pro.turnos_manana && pro.turnos_manana.length > 0;
    if (horarioSeleccionado === 'tarde') okHorario = pro.turnos_tarde && pro.turnos_tarde.length > 0;

    return okEsp && okObra && okBarrio && okLugar && okPrecio && okHorario && okNombre;
  });

  renderizarTarjetas(filtrados);
}

function renderizarTarjetas(lista) {
  const contenedor = document.getElementById('lista-profesionales');
  document.getElementById('contador-resultados').textContent = lista.length === 1 
  ? '1 profesional disponible en San Salvador' 
  : `${lista.length} profesionales disponibles en San Salvador`;

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
            <span class="slots-title">📅 Próximo día: ${pro.fecha_turnos || 'Sábado 14/11'}</span>
            <div class="slots-buttons">
                ${turnosAMostrar.map(hora => `
                <button class="btn-slot" onclick="abrirModal('${pro.nombre}', '${pro.especialidad}', '${pro.fecha_turnos || 'Sábado 14/11'}', '${hora}', '${pro.lugar_nombre} - Barrio ${pro.barrio}')">
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

// Cambio entre Paciente, Profesional y turnos
function cambiarVista(vista) {
  document.getElementById('vista-paciente').classList.add('hidden');
  document.getElementById('vista-profesional').classList.add('hidden');
  document.getElementById('vista-turnos').classList.add('hidden');

  document.getElementById('btn-modo-paciente').classList.remove('active');
  document.getElementById('btn-modo-profesional').classList.remove('active');
  document.getElementById('btn-modo-turnos').classList.remove('active');

  if (vista === 'paciente') {
    document.getElementById('vista-paciente').classList.remove('hidden');
    document.getElementById('btn-modo-paciente').classList.add('active');
  } else if (vista === 'turnos') {
    document.getElementById('vista-turnos').classList.remove('hidden');
    document.getElementById('btn-modo-turnos').classList.add('active');
    cargarTurnosReservados();
  } else {
    document.getElementById('vista-profesional').classList.remove('hidden');
    document.getElementById('btn-modo-profesional').classList.add('active');
  }
}

// Registrar nuevo profesional en Supabase en tiempo real
async function registrarProfesional(e) {
  e.preventDefault();
  const feedback = document.getElementById('feedback-profesional');
  const obrasChecked = Array.from(document.querySelectorAll('.chips-group input:checked')).map(cb => cb.value);

  const nuevoPro = {
    nombre: document.getElementById('reg-nombre').value.trim(),
    especialidad: document.getElementById('reg-especialidad').value,
    lugar_tipo: document.getElementById('reg-lugar-tipo').value,
    lugar_nombre: document.getElementById('reg-lugar-nombre').value.trim(),
    barrio: document.getElementById('reg-barrio').value,
    referencia: document.getElementById('reg-referencia').value.trim(),
    obras_sociales: obrasChecked.length ? obrasChecked : ['Particular'],
    precio: Number(document.getElementById('reg-precio').value),
    fecha_turnos: document.getElementById('reg-fecha').value.trim(),
    turnos_manana: ['09:00', '10:30'],
    turnos_tarde: ['17:00']
  };

  const { error } = await db.from('profesionales').insert([nuevoPro]);

  if (error) {
    feedback.textContent = '❌ Error al guardar: ' + error.message;
    feedback.className = 'feedback-box feedback-error';
    feedback.classList.remove('hidden');
  } else {
    feedback.textContent = `✅ ¡Perfil de ${nuevoPro.nombre} publicado con éxito! Ya podés verlo en el buscador.`;
    feedback.className = 'feedback-box feedback-success';
    feedback.classList.remove('hidden');
    document.getElementById('form-profesional').reset();
    await cargarProfesionales();
  }
}

// Modal de turnos
let turnoActual = {};

function abrirModal(nombre, esp, fecha, hora, direccion ) {
  turnoActual = { nombre, esp, fecha, hora, direccion };
  document.getElementById('modal-info').innerHTML = `
    <strong>Profesional:</strong> ${nombre} (${esp})<br>
    <strong>Día y Hora:</strong> ${fecha} a las <strong>${hora} hs</strong><br>
    <strong>Dirección:</strong> ${direccion}
  `;
  document.getElementById('modal-turno').classList.remove('hidden');
}

function cerrarModal() {
  document.getElementById('modal-turno').classList.add('hidden');
  document.getElementById('paciente-nombre').value = '';
  document.getElementById('paciente-dni').value = '';
  document.getElementById('paciente-telefono').value = '';
}

async function confirmarReserva() {
  const pacNombre = document.getElementById('paciente-nombre').value.trim();
  const pacDni = document.getElementById('paciente-dni').value.trim();
  const pacTel = document.getElementById('paciente-telefono').value.trim();
  const pacObra = document.getElementById('paciente-obra').value;

  if (!pacNombre || !pacDni || !pacTel) {
    return alert('Por favor completá tu nombre, DNI y telefono.');
  }

  const { error } = await db.from('turnos_reservados').insert([{
    profesional_nombre: turnoActual.nombre,
    especialidad: turnoActual.esp,
    fecha: turnoActual.fecha,
    horario: turnoActual.hora,
    direccion: turnoActual.direccion,
    paciente_nombre: pacNombre,
    paciente_dni: pacDni,
    paciente_telefono: pacTel,
    paciente_obra_social: pacObra
  }]);

  if (error) {
    alert('Hubo un error al registrar el turno: ' + error.message);
  } else {
    cerrarModal();
    document.getElementById('texto-comprobante').innerHTML = `
      <strong>Paciente:</strong> ${pacNombre} (${pacObra})<br>
      <strong>Profesional:</strong> ${turnoActual.nombre} (${turnoActual.esp})<br>
      <strong>Día y Hora:</strong> ${turnoActual.fecha} — ${turnoActual.hora} hs<br>
      <strong>Lugar:</strong> ${turnoActual.direccion}
    `;
    document.getElementById('banner-confirmacion').classList.remove('hidden');
    await cargarTurnosReservados();
  }
}

async function cargarTurnosReservados() {
  const contenedor = document.getElementById('lista-turnos-bd');
  if (!contenedor) return;

  const { data, error } = await db
    .from('turnos_reservados')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    contenedor.innerHTML = `<p>Error al cargar turnos: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = `<p style="color: #64748b; font-size: 0.9rem;">Aún no hay turnos reservados. Probá reservar uno desde la vista de Paciente.</p>`;
    return;
  }

  contenedor.innerHTML = data.map(t => `
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #0f766e; padding: 0.85rem 1rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
      <div>
        <strong>Paciente:</strong> ${t.paciente_nombre} (DNI: ${t.paciente_dni} • ${t.paciente_obra_social || 'Particular'})<br>
        <span style="font-size: 0.85rem; color: #334155;">📞 Tel: ${t.paciente_telefono || 'No informado'}</span><br>
        <span style="font-size: 0.85rem; color: #475569;">Atiende: <strong>${t.profesional_nombre}</strong> (${t.especialidad})</span><br>
        <span style="font-size: 0.8rem; color: #64748b;">📍 ${t.direccion || 'San Salvador de Jujuy'}</span>
      </div>
      <span style="background: #10b981; color: white; padding: 0.35rem 0.75rem; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">
        📅 ${t.fecha || 'Sábado 14/11'} • ${t.horario} hs
      </span>
    </div>
  `).join('');
}