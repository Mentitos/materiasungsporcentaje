let carrerasData = [];
let materiasData = [];
let materiasMap = new Map();



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

document.addEventListener('DOMContentLoaded', () => {
    const btnCopiarAlias = document.getElementById('btn-copiar-alias');
    if (btnCopiarAlias) {
        btnCopiarAlias.addEventListener('click', () => {
            const alias = "ARDOR.BICHO.PILOTO";
            navigator.clipboard.writeText(alias).then(() => {
                const tooltip = document.getElementById('tooltip-copiado');
                tooltip.classList.remove('hidden');
                setTimeout(() => tooltip.classList.add('hidden'), 2000);
            });
        });
    }
});

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
        const carrerasPorGrupo = await carrerasResponse.json();
        materiasData = await materiasResponse.json();

        materiasData.forEach(materia => {
            materiasMap.set(materia.id, materia.nombre);
        });

        carrerasData = Object.values(carrerasPorGrupo).flat();

        const contenedorCategorias = document.getElementById('contenedor-categorias');

        for (const [grupo, carrerasDelGrupo] of Object.entries(carrerasPorGrupo)) {
            if (carrerasDelGrupo.length === 0) continue;

            const seccion = document.createElement('div');
            seccion.className = 'seccion-carrera';

            const titulo = document.createElement('h2');
            titulo.textContent = grupo;
            seccion.appendChild(titulo);

            const ul = document.createElement('ul');
            carrerasDelGrupo.forEach(carreraData => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = "#";
                a.textContent = carreraData.nombre.replace(/_/g, " ");
                a.dataset.carrera = carreraData.nombre;
                a.addEventListener('click', alSeleccionarCarrera);
                li.appendChild(a);
                ul.appendChild(li);
            });
            seccion.appendChild(ul);
            contenedorCategorias.appendChild(seccion);
        }
    } catch (error) {
        console.error('Error al cargar los datos:', error);
        alert('No se pudieron cargar los datos. Revisa la consola para más detalles.');
    }

    btnVolverEl.addEventListener('click', mostrarMenu);
    btnLimpiarCacheEl.addEventListener('click', limpiarProgreso);

    cargarDonaciones();
});

async function cargarDonaciones() {
    try {
        const response = await fetch('donaciones.json');
        const data = await response.json();
        renderizarDonaciones(data);
    } catch (error) {
        console.error('Error al cargar donaciones:', error);
    }
}

function renderizarDonaciones(data) {
    const { titulo, monto_actual, metas } = data;

    const container = document.getElementById('donaciones-container');
    const tituloEl = document.getElementById('donaciones-titulo');
    const porcentajeEl = document.getElementById('donaciones-porcentaje');
    const barraEl = document.getElementById('donaciones-barra');
    const markersEl = document.getElementById('donaciones-metas-markers');
    const montoMinEl = document.getElementById('donaciones-monto-min');
    const montoMaxEl = document.getElementById('donaciones-monto-max');

    if (!container || !metas || metas.length === 0) return;

    container.classList.remove('hidden');
    tituloEl.textContent = titulo;

    const maxMonto = metas[metas.length - 1].monto;
    const porcentajeNum = (monto_actual / maxMonto) * 100;
    const porcentajeFinal = Math.min(porcentajeNum, 100);

    barraEl.style.width = `${porcentajeFinal}%`;
    porcentajeEl.textContent = `${porcentajeFinal.toFixed(1)}%`;

    montoMinEl.textContent = `${monto_actual.toLocaleString('es-AR')} $`;
    montoMaxEl.textContent = `Meta: ${maxMonto.toLocaleString('es-AR')} $ ARS`;

    markersEl.innerHTML = '';
    const listaMetasEl = document.getElementById('donaciones-metas-lista');
    if (listaMetasEl) listaMetasEl.innerHTML = '<h4>Próximos Objetivos:</h4>';

    metas.forEach(meta => {
        const posicion = (meta.monto / maxMonto) * 100;
        const reached = monto_actual >= meta.monto;

        if (meta.monto !== maxMonto) {
            const dot = document.createElement('div');
            dot.className = `meta-dot ${reached ? 'reached' : ''}`;
            dot.style.left = `${posicion}%`;
            markersEl.appendChild(dot);
        }

        if (listaMetasEl) {
            const item = document.createElement('div');
            item.className = `meta-list-item ${reached ? 'reached' : ''}`;
            item.innerHTML = `
                <span class="meta-name">${reached ? '✅' : '🎯'} ${meta.nombre}</span>
                <span class="meta-amount">$${meta.monto.toLocaleString('es-AR')}</span>
            `;
            listaMetasEl.appendChild(item);
        }
    });
}

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

            select.addEventListener('change', () => {
                label.textContent = materiasMap.get(parseInt(select.value, 10));

                if (!checkbox.checked) return;

                ids.forEach(id => progresoActual.delete(id));
                progresoActual.add(parseInt(select.value, 10));
                guardarProgreso(carreraActual.nombre, progresoActual);
            });

            checkbox.addEventListener('change', () => {
                ids.forEach(id => progresoActual.delete(id));

                if (checkbox.checked) {
                    progresoActual.add(parseInt(select.value, 10));
                }

                guardarProgreso(carreraActual.nombre, progresoActual);
                actualizarProgresoVisual();
            });

            container.appendChild(checkbox);
            container.appendChild(label);
            container.appendChild(select);
            li.appendChild(container);
        }


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

    Particle.prototype.update = function () {
        this.y += this.speed;
        this.rotation += this.speed / 2;
        if (this.y > canvas.height) {
            this.y = -this.size;
            this.x = Math.random() * canvas.width;
        }
    };

    Particle.prototype.draw = function () {
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
