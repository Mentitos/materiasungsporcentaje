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
const mensajeMotivacionalEl = document.getElementById('mensaje-motivacional');
const confettiCanvas = document.getElementById('confetti-canvas');

let carreraActual = null;
let progresoActual = new Set();

// esto para detectar si en el json de carreras.js aparece algo así: < "87:39" >
function esMateriaCompuesta(materia) { 
    return typeof materia === 'string' && materia.includes(':');
}
// con esto obtenemos las materias < 87 > y < 39 > del ejemplo anterior
function parseMateria(materia) {
    return materia.split(':').map(id => parseInt(id, 10));
}

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
    carreraActual.materias.forEach((materiaRaw, index) => {
        const li = document.createElement('li');
        li.className = 'materia-item';

        /* ===== Materia compuesta ===== */
        if (esMateriaCompuesta(materiaRaw)) {
            const ids = parseMateria(materiaRaw);

            const container = document.createElement('div');
            container.className = 'materia-compuesta';

            const select = document.createElement('select');
            select.className = 'materia-select';

            ids.forEach(id => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = materiasMap.get(id) ?? `Materia ${id}`;
                select.appendChild(opt);
            });

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';

            const label = document.createElement('label');
            label.className = 'materia-label';

            const aprobada = [...progresoActual].find(id => ids.includes(id));
            if (aprobada) {
                select.value = aprobada;
                checkbox.checked = true;
            }

            label.textContent = materiasMap.get(parseInt(select.value, 10));

            // cambia la opción seleccionada en el select lol
            select.addEventListener('change', () => {
                label.textContent = materiasMap.get(parseInt(select.value, 10));

                if (!checkbox.checked) return;

                ids.forEach(id => progresoActual.delete(id));
                progresoActual.add(parseInt(select.value, 10));
                guardarProgreso(carreraActual.nombre, progresoActual);
            });

            // checkbox como las demás
            checkbox.addEventListener('change', () => {
                ids.forEach(id => progresoActual.delete(id));

                if (checkbox.checked) {
                    progresoActual.add(parseInt(select.value, 10));
                }

                guardarProgreso(carreraActual.nombre, progresoActual);
                actualizarProgresoVisual();
            });

            container.appendChild(checkbox);
            container.appendChild(label); // este label es el que pone la materia seleccionada
            container.appendChild(select);
            li.appendChild(container);
        }


        /* ===== Materia normal ===== */
        else {
            const materiaId = parseInt(materiaRaw, 10);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.materiaId = materiaId;
            checkbox.checked = progresoActual.has(materiaId);

            const label = document.createElement('label');
            label.textContent = materiasMap.get(materiaId);

            checkbox.addEventListener('change', alMarcarMateria);

            li.appendChild(checkbox);
            li.appendChild(label);
        }

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
    stopConfetti();
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

    if (porcentaje === 100) {
        mensajeMotivacionalEl.textContent = "¡Felicidades, siempre supe que podías!";
        progresoBarraEl.classList.add('rainbow');
        startConfetti();
    } else if (porcentaje > 50) {
        mensajeMotivacionalEl.textContent = "¡Dale que se puede, ya mitad de la línea recta!";
        progresoBarraEl.classList.remove('rainbow');
        stopConfetti();
    } else {
        mensajeMotivacionalEl.textContent = "";
        progresoBarraEl.classList.remove('rainbow');
        stopConfetti();
    }
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

// Confetti JIJI
let confettiAnimationId;

function startConfetti() {
    const canvas = confettiCanvas;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const numberOfParticles = 200;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#8b00ff"];

    function Particle() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height - canvas.height;
        this.size = Math.random() * 5 + 2;
        this.speed = Math.random() * 3 + 2;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.rotation = Math.random() * 360;
    }

    Particle.prototype.update = function() {
        this.y += this.speed;
        this.rotation += this.speed / 2;
        if (this.y > canvas.height) {
            this.y = -this.size;
            this.x = Math.random() * canvas.width;
        }
    };

    Particle.prototype.draw = function() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    };

    for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        confettiAnimationId = requestAnimationFrame(animate);
    }

    animate();
}

function stopConfetti() {
    if (confettiAnimationId) {
        cancelAnimationFrame(confettiAnimationId);
    }
    const canvas = confettiCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
