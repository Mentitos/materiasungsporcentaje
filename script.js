let carrerasData = [];
let materiasData = [];
let materiasMap = new Map();

const grupos = {
    ingenieria: ["Electromecanica", "Industrial", "Quimica"],
    licenciatura: [
        "Administracion De Empresas", "Administracion Publica", "Comunicaciones", 
        "Cultura Y Lenguajes Artisticos", "Ecologia", "Economia Industrial", 
        "Economia Politica", "Educacion", "Estudios Politicos", "Politica Social", 
        "Sistemas", "Urbanismos"
    ],
    profesorado: [
        "Filosofia", "Fisica", "Geografia", "Historia", "Literatura", 
        "Matematica", "Prof Economia"
    ],
    tecnicatura: [
        "Automatizacion Y Control", "Informatica", "Sist. De Info. Geografica", 
        "Tec. Quimica"
    ]
};

const menuCarrerasEl = document.getElementById('menu-carreras');
const detalleCarreraEl = document.getElementById('detalle-carrera');
const btnVolverEl = document.getElementById('btn-volver');
const nombreCarreraEl = document.getElementById('nombre-carrera');
const progresoTextoEl = document.getElementById('progreso-texto');
const progresoBarraEl = document.getElementById('progreso-barra');
const listaMateriasEl = document.getElementById('lista-materias');
const btnLimpiarCacheEl = document.getElementById('btn-limpiar-cache');

let carreraActual = null;
let progresoActual = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [carrerasResponse, materiasResponse] = await Promise.all([
            fetch('carreras.json'),
            fetch('materias.json')
        ]);
        carrerasData = await carrerasResponse.json();
        materiasData = await materiasResponse.json();
        
        materiasData.forEach(materia => {
            materiasMap.set(materia.id, materia.nombre);
        });

        for (const [grupo, carreras] of Object.entries(grupos)) {
            const listaEl = document.getElementById(`lista-${grupo}`);
            if (listaEl) {
                carreras.forEach(nombreCarrera => {
                    const carreraData = carrerasData.find(c => c.nombre === nombreCarrera);
                    if (carreraData) {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.href = "#";
                        a.textContent = carreraData.nombre.replace(/_/g, " "); 
                        a.dataset.carrera = carreraData.nombre; 
                        a.addEventListener('click', alSeleccionarCarrera);
                        li.appendChild(a);
                        listaEl.appendChild(li);
                    } else {
                        console.warn(`La carrera "${nombreCarrera}" definida en los grupos no se encontró en carrerasData.`);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error al cargar los datos:', error);
        alert('No se pudieron cargar los datos. Revisa la consola para más detalles.');
    }

    btnVolverEl.addEventListener('click', mostrarMenu);
    btnLimpiarCacheEl.addEventListener('click', limpiarProgreso);
});

function alSeleccionarCarrera(e) {
    e.preventDefault();
    const nombreCarrera = e.target.dataset.carrera;
    mostrarDetalle(nombreCarrera);
}

function mostrarDetalle(nombreCarrera) {
    carreraActual = carrerasData.find(c => c.nombre === nombreCarrera);
    if (!carreraActual) return;

    progresoActual = cargarProgreso(carreraActual.nombre);

    nombreCarreraEl.textContent = carreraActual.nombre.replace(/_/g, " ");
    listaMateriasEl.innerHTML = '';
    carreraActual.materias.forEach((materiaId, index) => {
        const li = document.createElement('li');
        li.className = 'materia-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `materia-${index}`;
        checkbox.dataset.materiaId = materiaId; 
        checkbox.checked = progresoActual.has(materiaId);
        
        const label = document.createElement('label');
        label.htmlFor = `materia-${index}`;
        label.textContent = materiasMap.get(materiaId);

        checkbox.addEventListener('change', alMarcarMateria);
        
        li.appendChild(checkbox);
        li.appendChild(label);
        listaMateriasEl.appendChild(li);
    });

    actualizarProgresoVisual();

    menuCarrerasEl.classList.add('hidden');
    detalleCarreraEl.classList.remove('hidden');
    window.scrollTo(0, 0); 
}

function mostrarMenu() {
    detalleCarreraEl.classList.add('hidden');
    menuCarrerasEl.classList.remove('hidden');
    carreraActual = null; 
    progresoActual.clear();
}

function alMarcarMateria(e) {
    const materiaId = parseInt(e.target.dataset.materiaId, 10);
    const isChecked = e.target.checked;

    if (isChecked) {
        progresoActual.add(materiaId);
    } else {
        progresoActual.delete(materiaId);
    }
    
    guardarProgreso(carreraActual.nombre, progresoActual);
    sincronizarMateriaEnOtrasCarreras(materiaId, isChecked);
    actualizarProgresoVisual();
}

function sincronizarMateriaEnOtrasCarreras(materiaId, isChecked) {
    carrerasData.forEach(carrera => {
        if (carrera.nombre !== carreraActual.nombre && carrera.materias.includes(materiaId)) {
            let progresoOtraCarrera = cargarProgreso(carrera.nombre);
            if (isChecked) {
                progresoOtraCarrera.add(materiaId);
            } else {
                progresoOtraCarrera.delete(materiaId);
            }
            guardarProgreso(carrera.nombre, progresoOtraCarrera);
        }
    });
}

function actualizarProgresoVisual() {
    if (!carreraActual) return;

    const totalMaterias = carreraActual.materias.length;
    const completadas = progresoActual.size;
    
    const porcentaje = totalMaterias > 0 ? (completadas / totalMaterias) * 100 : 0;

    progresoTextoEl.textContent = `Progreso: ${completadas} / ${totalMaterias} materias`;
    
    progresoBarraEl.style.width = `${porcentaje}%`;
    progresoBarraEl.textContent = `${porcentaje.toFixed(1)}%`;
}

function guardarProgreso(nombreCarrera, progresoSet) {
    const data = JSON.stringify(Array.from(progresoSet));
    localStorage.setItem(`progreso_${nombreCarrera}`, data);
}

function cargarProgreso(nombreCarrera) {
    const data = localStorage.getItem(`progreso_${nombreCarrera}`);
    if (data) {
        return new Set(JSON.parse(data));
    }
    return new Set(); 
}

function limpiarProgreso() {
    const confirmado = confirm(
        "¿Estás seguro de que deseas borrar TODO el progreso guardado?\n" +
        "Esta acción no se puede deshacer."
    );
    
    if (confirmado) {
        localStorage.clear();
        location.reload();
    }
}