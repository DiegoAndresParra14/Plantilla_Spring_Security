'use strict';

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[c]));

const money = v => new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
}).format(Number(v || 0));

const date = v => v ? new Date(v).toLocaleString('es-CO') : '—';
const path = v => encodeURIComponent(v);

const state = {
    token: sessionStorage.getItem('nexo.token'),
    base: localStorage.getItem('nexo.base') || 'http://localhost:8050',
    me: null,
    view: 'home',
    page: 0,
    rows: [],
    cache: {},
    busy: false
};

const sections = {
    home: { title: 'Inicio', icon: '⌂' },
    clients: { title: 'Clientes', icon: '♙', prefix: 'CLIENT', endpoint: '/api/clients' },
    videogames: { title: 'Videojuegos', icon: '🎮', prefix: 'VIDEOGAME', endpoint: '/api/videogames' },
    purchases: { title: 'Compras', icon: '↘', prefix: 'PURCHASE', endpoint: '/api/purchases' },
    sales: { title: 'Ventas', icon: '↗', prefix: 'SALE', endpoint: '/api/sales' },
    users: { title: 'Usuarios', icon: '♧' },
    roles: { title: 'Roles', icon: '◈' },
    permissions: { title: 'Permisos', icon: '♚' }
};

const can = p => state.me?.effectivePermissions?.includes(p);
const any = ps => ps.some(can);

function visible(view) {
    if (view === 'home') return true;
    if (view === 'users') {
        return any(['USER_READ', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'ROLE_ASSIGN', 'PERMISSION_ASSIGN']);
    }
    if (view === 'roles') return can('ROLE_MANAGE');
    if (view === 'permissions') return can('PERMISSION_MANAGE');

    if (view === 'videogames') {
        return any(['VIDEOGAME_READ', 'VIDEOGAME_CREATE', 'VIDEOGAME_UPDATE', 'VIDEOGAME_DELETE', 'PRODUCT_READ', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE']);
    }

    const p = sections[view].prefix;
    return any([p + '_READ', p + '_CREATE', p + '_UPDATE', p + '_DELETE', p + '_CANCEL']);
}

function toast(message, bad = false) {
    $('#toast').textContent = message;
    $('#toast').className = 'visible' + (bad ? ' bad' : '');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
        $('#toast').className = '';
    }, 5500);
}

function logout() {
    state.token = null;
    state.me = null;
    state.cache = {};
    sessionStorage.removeItem('nexo.token');
    $('#app').hidden = true;
    $('#login-screen').hidden = false;
    if ($('#modal').open) $('#modal').close();
    $('#login-form').password.value = '';
}

async function api(url, { method = 'GET', body, auth = true } = {}) {
    const headers = { Accept: 'application/json, text/plain' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && state.token) headers.Authorization = 'Bearer ' + state.token;

    let response;
    try {
        response = await fetch(state.base + url, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });
    } catch {
        throw new Error('No se pudo conectar con el servidor. Revisa la URL, Spring Boot y PostgreSQL.');
    }

    const text = await response.text();
    let data = text;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {}

    if (!response.ok) {
        if (auth && (response.status === 401 || (response.status === 403 && url === '/api/auth/me'))) {
            logout();
        }
        let error = typeof data === 'string'
            ? data
            : (data?.detail || data?.message || Object.entries(data || {})
                .filter(([k]) => !['timestamp', 'status', 'error', 'path'].includes(k))
                .map(([k, v]) => k + ': ' + v)
                .join('\n'));

        if (response.status === 403) {
            error = 'Tu cuenta no tiene permiso para esta operación, o la sesión ya no está disponible.';
        }
        throw new Error(error || `La operación no se completó (${response.status}).`);
    }

    return data;
}

async function refreshMe() {
    state.me = await api('/api/auth/me');
    $('#session-name').textContent = state.me.username;
    $('#session-role').textContent = state.me.role || 'Sin rol';
    $('#avatar').textContent = state.me.username.slice(0, 2).toUpperCase();
    $('#server-label').textContent = state.base;
    $('#navigation').innerHTML = Object.entries(sections)
        .filter(([k]) => visible(k))
        .map(([k, v]) => `
            <button data-nav="${k}" class="${state.view === k ? 'active' : ''}">
                <span class="nav-icon">${v.icon}</span>${v.title}
            </button>
        `).join('');
}

async function enter() {
    await refreshMe();
    $('#login-screen').hidden = true;
    $('#app').hidden = false;
    await navigate('home');
}

$('#login-form').base.value = state.base;

$('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.currentTarget;
    const b = f.querySelector('button[type=submit]');
    b.disabled = true;
    $('#login-error').textContent = '';

    try {
        const base = f.base.value.trim().replace(/\/+$/, '');
        const u = new URL(base);
        if (!['http:', 'https:'].includes(u.protocol)) {
            throw new Error('Utiliza una URL HTTP o HTTPS.');
        }

        state.base = base;
        localStorage.setItem('nexo.base', base);
        state.token = await api('/api/auth/login', {
            method: 'POST',
            auth: false,
            body: {
                username: f.username.value.trim(),
                password: f.password.value
            }
        });
        sessionStorage.setItem('nexo.token', state.token);
        await enter();
        f.password.value = '';
    } catch (error) {
        logout();
        $('#login-error').textContent = error.message;
    } finally {
        b.disabled = false;
    }
});

$('#logout').onclick = logout;
$('#menu-toggle').onclick = () => $('#sidebar').classList.toggle('open');
$('#navigation').onclick = e => {
    const b = e.target.closest('[data-nav]');
    if (b) navigate(b.dataset.nav);
};

function heading(title, subtitle, actions = '') {
    return `
        <div class="page-heading">
            <div>
                <span class="eyebrow">ESPACIO DE TRABAJO</span>
                <h1>${esc(title)}</h1>
                <p>${esc(subtitle)}</p>
            </div>
            <div class="toolbar">${actions}</div>
        </div>
    `;
}

function button(action, label, data = '', className = 'primary') {
    return `<button type="button" class="${className}" data-action="${action}" ${data}>${label}</button>`;
}

function badge(active) {
    return `<span class="badge ${active ? '' : 'off'}">${active ? 'Activo' : 'Inactivo'}</span>`;
}

function chips(values) {
    return `
        <div class="chips">
            ${(values || []).map(v => `<span class="chip">${esc(v)}</span>`).join('') || '<span class="muted">Sin permisos</span>'}
        </div>
    `;
}

async function navigate(view, page = 0) {
    if (!visible(view)) view = 'home';
    state.view = view;
    state.page = page;
    $('#sidebar').classList.remove('open');
    $('#crumb').textContent = sections[view].title;
    $('#navigation').querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', b.dataset.nav === view);
    });

    $('#content').innerHTML = '<div class="empty">Cargando tu espacio…</div>';

    try {
        await render();
    } catch (error) {
        $('#content').innerHTML = heading(sections[view].title, 'No se pudo cargar la información') + `
            <div class="panel empty">
                ${esc(error.message)}<br><br>
                ${button('reload', 'Reintentar')}
            </div>
        `;
    }
}

async function render() {
    if (state.view === 'home') return dashboard();

    const view = state.view;
    const conf = sections[view];
    let actions = button('reload', '↻ Actualizar', '', 'secondary');
    let rows = [];
    let read = false;

    if (['clients', 'videogames', 'purchases', 'sales'].includes(view)) {
        read = view === 'videogames' ? (can('VIDEOGAME_READ') || can('PRODUCT_READ')) : can(conf.prefix + '_READ');

        const canCreate = view === 'videogames' ? (can('VIDEOGAME_CREATE') || can('PRODUCT_CREATE')) : can(conf.prefix + '_CREATE');
        if (canCreate) {
            actions = button('create', '＋ ' + (view === 'sales' ? 'Nueva venta' : view === 'purchases' ? 'Nueva compra' : view === 'videogames' ? 'Nuevo videojuego' : 'Nuevo cliente')) + actions;
        }

        const canUpdate = view === 'videogames' ? (can('VIDEOGAME_UPDATE') || can('PRODUCT_UPDATE')) : can(conf.prefix + '_UPDATE');
        if (!read && ['clients', 'videogames'].includes(view) && canUpdate) {
            actions += button('edit-business-id', 'Editar por ID', '', 'secondary');
        }

        const canDelete = view === 'videogames' ? (can('VIDEOGAME_DELETE') || can('PRODUCT_DELETE')) : can(conf.prefix + '_DELETE');
        if (!read && ['clients', 'videogames'].includes(view) && canDelete) {
            actions += button('deactivate-business-id', 'Eliminar por ID', '', 'secondary');
        }

        if (!read && view === 'sales' && can('SALE_CANCEL')) {
            actions += button('cancel-sale-id', 'Anular por ID', '', 'secondary');
        }

        if (read) {
            const result = await api(conf.endpoint + `?page=${state.page}&size=20`);
            rows = result.content || [];
            state.total = result.totalElements || 0;
            state.pages = result.totalPages || 0;
        }
    } else if (view === 'users') {
        read = can('USER_READ');

        if (can('USER_CREATE')) actions = button('create', '＋ Nuevo usuario') + actions;
        if (can('ROLE_ASSIGN')) actions += button('user-role', 'Asignar rol', '', 'secondary');
        if (can('PERMISSION_ASSIGN')) {
            actions += button('user-permission', 'Dar permiso', '', 'secondary') + button('revoke-permission-id', 'Retirar permiso', '', 'secondary');
        }
        if (!read && can('USER_UPDATE')) actions += button('edit-named', 'Actualizar cuenta', '', 'secondary');
        if (!read && can('USER_DELETE')) actions += button('delete-named', 'Eliminar cuenta', '', 'secondary');

        if (read) rows = await api('/api/user/all');
    } else if (view === 'roles') {
        read = true;
        rows = await api('/api/roles');
        actions = button('create', '＋ Nuevo rol') + actions;
    } else {
        read = true;
        rows = (await api('/api/permissions')).map(name => ({ name }));
        actions = button('create', '＋ Nuevo permiso') + actions;
    }

    state.rows = rows;

    const intro = {
        clients: 'Organiza tus relaciones comerciales y clientes.',
        videogames: 'Tu catálogo de juegos y sus estados de desarrollo.',
        purchases: 'Registro de egresos y costos de desarrollo.',
        sales: 'Cada ingreso registrado con su detalle e historial.',
        users: 'Cuentas, estados y accesos de tu equipo.',
        roles: 'Un rol por usuario. Capacidades compartidas por equipo.',
        permissions: 'El catálogo de capacidades de tu aplicación.'
    };

    $('#content').innerHTML = heading(conf.title, intro[view], actions) + (
        !read
            ? '<div class="panel empty">Puedes realizar las acciones habilitadas arriba. Tu cuenta no tiene permiso para consultar este listado.</div>'
            : table(view, rows)
    );
}

function table(view, rows) {
    let headers;
    let cells;
    const action = (name, label, i, cls = 'link-button') => button(name, label, `data-index="${i}"`, cls);

    if (view === 'clients') {
        headers = ['Cliente', 'Contacto', 'Empresa', 'Estado', 'Acciones'];
        cells = (r, i) => [
            `<span class="cell-title">${esc(r.nombre)}</span><small class="cell-sub">Cliente #${r.id}</small>`,
            `${esc(r.correo)}<small class="cell-sub">${esc(r.telefono || 'Sin teléfono')}</small>`,
            esc(r.empresa || 'Particular'),
            badge(r.activo),
            (r.activo && can('CLIENT_UPDATE') ? action('edit', 'Editar', i) : '') +
            (r.activo && can('CLIENT_DELETE') ? action('deactivate', 'Desactivar', i) : '')
        ];
    }
    if (view === 'videogames') {
        headers = ['Videojuego', 'Plataforma', 'Estado', 'Cliente', 'Acciones'];
        cells = (r, i) => [
            `<span class="cell-title">${esc(r.titulo)}</span><small class="cell-sub">Juego #${r.id}</small>`,
            `<span class="badge">${esc(r.plataforma)}</span>`,
            `<span class="badge">${esc(r.estado)}</span>`,
            esc(r.clienteNombre || 'Sin cliente asignado'),
            ((can('VIDEOGAME_UPDATE') || can('PRODUCT_UPDATE')) ? action('edit', 'Editar', i) : '') +
            ((can('VIDEOGAME_DELETE') || can('PRODUCT_DELETE')) ? action('deactivate', 'Eliminar', i) : '')
        ];
    }
    if (view === 'purchases') {
        headers = ['Compra', 'Videojuego', 'Proveedor', 'Descripción', 'Costo', 'Acciones'];
        cells = (r, i) => [
            `<span class="cell-title">#${r.id}</span><small class="cell-sub">${esc(r.usuarioUsername || '')} · ${date(r.fecha)}</small>`,
            esc(r.videojuegoTitulo),
            esc(r.proveedor),
            esc(r.descripcion),
            money(r.costo),
            action('purchase-detail', 'Ver detalle', i) +
            (can('PURCHASE_UPDATE') ? action('edit', 'Editar', i) : '') +
            (can('PURCHASE_DELETE') ? action('delete-purchase', 'Eliminar', i) : '')
        ];
    }
    if (view === 'sales') {
        headers = ['Venta', 'Videojuego', 'Concepto', 'Monto', 'Acciones'];
        cells = (r, i) => [
            `<span class="cell-title">#${r.id}</span><small class="cell-sub">${esc(r.usuarioUsername || '')} · ${date(r.fecha)}</small>`,
            esc(r.videojuegoTitulo),
            esc(r.concepto),
            money(r.monto),
            action('sale-detail', 'Ver detalle', i) +
            (can('SALE_CANCEL') ? action('cancel-sale', 'Anular', i) : '')
        ];
    }
    if (view === 'users') {
        headers = ['Usuario', 'Rol', 'Estado', 'Acciones'];
        cells = (r, i) => [
            `<span class="cell-title">${esc(r.username)}</span><small class="cell-sub">${esc(r.email)}</small>`,
            `<span class="badge">${esc(r.role || 'Sin rol')}</span>`,
            `<span class="badge ${r.locked || r.disabled ? 'off' : ''}">${r.disabled ? 'Deshabilitado' : r.locked ? 'Bloqueado' : 'Habilitado'}</span>`,
            (can('USER_UPDATE') ? action('edit', 'Editar', i) : '') +
            action('user-detail', 'Permisos', i) +
            (can('ROLE_ASSIGN') ? action('user-role', 'Rol', i) : '') +
            (can('PERMISSION_ASSIGN') ? action('user-permission', '＋ Permiso', i) : '') +
            (can('USER_DELETE') ? action('delete-user', 'Eliminar', i) : '')
        ];
    }
    if (view === 'roles') {
        headers = ['Rol', 'Permisos heredados', 'Acciones'];
        cells = (r, i) => [
            `<span class="cell-title">${esc(r.name)}</span>`,
            chips(r.permissions),
            can('PERMISSION_MANAGE') ? action('role-permission', 'Gestionar permisos', i) : '—'
        ];
    }
    if (view === 'permissions') {
        headers = ['Permiso', 'Tipo'];
        cells = r => [
            `<span class="cell-title">${esc(r.name)}</span>`,
            'Capacidad disponible para roles y usuarios'
        ];
    }

    const paging = ['clients', 'videogames', 'purchases', 'sales'].includes(view);

    return `
        <section class="panel">
            <div class="panel-title">
                <h3>${esc(sections[view].title)} <span class="muted">· ${paging ? state.total : rows.length}</span></h3>
                <div class="toolbar">
                    <input id="filter" aria-label="Buscar en los resultados visibles" placeholder="Buscar en esta página…">
                </div>
            </div>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.map((r, i) => `
                            <tr>
                                ${cells(r, i).map((v, k) => `
                                    <td ${k === headers.length - 1 ? 'class="actions"' : ''}>${v}</td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div id="empty-table" class="empty" ${rows.length ? 'hidden' : ''}>
                    Aún no hay registros. Empieza con una nueva creación.
                </div>
            </div>
            ${paging ? `
                <div class="pagination">
                    <span>Página ${state.page + 1} de ${Math.max(state.pages, 1)} · ${state.total} registros</span>
                    <div>
                        <button data-action="previous" ${state.page === 0 ? 'disabled' : ''}>← Anterior</button>
                        <button data-action="next" ${state.page + 1 >= state.pages ? 'disabled' : ''}>Siguiente →</button>
                    </div>
                </div>
            ` : ''}
        </section>
    `;
}

async function dashboard() {
    const first = state.me.username;
    const metrics = await Promise.all(['clients', 'videogames', 'purchases', 'sales'].map(async key => {
        let readP = false;
        if (key === 'videogames') readP = can('VIDEOGAME_READ') || can('PRODUCT_READ');
        else readP = can(sections[key].prefix + '_READ');

        return {
            key,
            total: readP
                ? (await api(sections[key].endpoint + '?size=1')).totalElements
                : null
        };
    }));

    const links = Object.entries(sections).filter(([key]) => key !== 'home' && visible(key));

    $('#content').innerHTML = heading(
        `Hola, ${first}.`,
        'Tu operación, de un vistazo.',
        `<span class="date-label">${esc(new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }))}</span>`
    ) + `
        <div class="hero">
            <div>
                <span class="eyebrow">UN ESPACIO PARA TU EQUIPO</span>
                <h2>La gestión empieza con una buena conexión.</h2>
                <p>Consulta tus módulos, registra una operación o administra los accesos. Todo desde tu espacio de trabajo.</p>
            </div>
            <span class="hero-mark">◈</span>
        </div>
        <div class="cards">
            ${metrics.map(({ key, total }) => `
                <div class="card">
                    <span class="card-icon">${sections[key].icon}</span>
                    <div>
                        <h3>${sections[key].title}</h3>
                        <p>${total === null ? 'Sin acceso al listado' : 'Registros en tu espacio'}</p>
                    </div>
                    <div class="metric">${total ?? '—'}</div>
                    ${visible(key) ? button('go', 'Abrir módulo →', `data-view="${key}"`, 'link-button') : ''}
                </div>
            `).join('')}
        </div>
        <section class="panel">
            <div class="panel-title">
                <h3>Accesos rápidos</h3>
                <span class="badge">${esc(state.me.role)}</span>
            </div>
            <div class="quick-links">
                ${links.map(([key, v]) => `
                    <button class="quick-link" data-action="go" data-view="${key}">
                        <span>${v.icon} &nbsp; ${v.title}<small>Ir a ${v.title.toLowerCase()}</small></span>
                        <span>→</span>
                    </button>
                `).join('') || '<div class="empty">Tu cuenta todavía no tiene permisos para estos módulos.</div>'}
            </div>
        </section>
    `;
}

let modalSubmit = null;

function modal(title, body, onSubmit, label = 'Guardar') {
    const f = $('#modal-form');
    f.reset();
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = body;
    $('#modal-error').textContent = '';
    $('#modal-save').textContent = label;
    $('#modal-save').hidden = !onSubmit;
    $('#modal-cancel').textContent = onSubmit ? 'Cancelar' : 'Cerrar';
    modalSubmit = onSubmit;
    if (!$('#modal').open) $('#modal').showModal();
}

$('#modal-close').onclick = $('#modal-cancel').onclick = () => $('#modal').close();

$('#modal').addEventListener('click', e => {
    if (e.target === $('#modal')) {
        const rect = e.target.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
            e.target.close();
        }
    }
});

$('#modal-form').onsubmit = async e => {
    e.preventDefault();
    if (!modalSubmit) return;

    const submit = modalSubmit;
    const b = $('#modal-save');
    b.disabled = true;
    $('#modal-error').textContent = '';

    try {
        await submit(new FormData(e.currentTarget));
        $('#modal').close();
        state.cache = {};
        await refreshMe();
        await navigate(state.view, state.page);
        toast('Cambios guardados correctamente.');
    } catch (error) {
        $('#modal-error').textContent = error.message;
    } finally {
        b.disabled = false;
    }
};

const field = (label, name, value = '', type = 'text', extra = '') => `
    <label>
        ${label}
        <input name="${name}" type="${type}" value="${esc(value)}" ${extra}>
    </label>
`;

function check(label, name, checked) {
    return `
        <label class="check-label">
            <input type="checkbox" name="${name}" ${checked ? 'checked' : ''}>
            ${label}
        </label>
    `;
}

async function options(url) {
    return await api(url);
}

async function picker(name, label, kind, current = '') {
    let values = [];
    if (kind === 'role' && can('ROLE_MANAGE')) {
        values = (await options('/api/roles')).map(r => r.name);
    }
    if (kind === 'permission' && can('PERMISSION_MANAGE')) {
        values = await options('/api/permissions');
    } else if (kind === 'permission' && can('PERMISSION_ASSIGN')) {
        values = await options('/api/user/permissions');
    }

    if (values.length) {
        return `
            <label>
                ${label}
                <select name="${name}" required>
                    ${values.map(v => `<option ${v === current ? 'selected' : ''} value="${esc(v)}">${esc(v)}</option>`).join('')}
                </select>
            </label>
        `;
    }

    return field(label, name, current || (kind === 'role' ? 'CLIENT_READ' : ''), 'text', 'required maxlength="50"');
}

async function entityForm(row, askId = false) {
    const view = state.view;
    const edit = !!row && Object.keys(row).length > 0;
    row = row || {};
    let body = '';

    if (view === 'clients') {
        body = field('Nombre', 'nombre', row.nombre, 'text', 'required maxlength="150"') + `
            <div class="fields">
                ${field('Correo', 'correo', row.correo, 'email', 'required')}
                ${field('Teléfono', 'telefono', row.telefono, 'tel', 'maxlength="30"')}
            </div>
            ${field('Empresa', 'empresa', row.empresa, 'text', 'maxlength="150"')}
        `;
    }

    if (view === 'videogames') {
        const clients = can('CLIENT_READ') ? (await allPages('/api/clients')).filter(r => r.activo) : [];
        const clientSelect = clients.length
            ? `
                <label>
                    Cliente
                    <select name="clienteId" required>
                        <option value="">Selecciona un cliente</option>
                        ${clients.map(c => `<option value="${c.id}" ${row.clienteId === c.id ? 'selected' : ''}>${esc(c.nombre)} · #${c.id}</option>`).join('')}
                    </select>
                </label>
            `
            : field('Identificador del cliente', 'clienteId', row.clienteId, 'number', 'required min="1" step="1"');

        body = field('Título', 'titulo', row.titulo, 'text', 'required maxlength="150"') + `
            <div class="fields">
                <label>
                    Plataforma
                    <select name="plataforma" required>
                        <option value="PC" ${row.plataforma === 'PC' ? 'selected' : ''}>PC</option>
                        <option value="CONSOLA" ${row.plataforma === 'CONSOLA' ? 'selected' : ''}>Consola</option>
                        <option value="MOVIL" ${row.plataforma === 'MOVIL' ? 'selected' : ''}>Móvil</option>
                        <option value="WEB" ${row.plataforma === 'WEB' ? 'selected' : ''}>Web</option>
                    </select>
                </label>
                <label>
                    Estado
                    <select name="estado" required>
                        <option value="PLANEACION" ${row.estado === 'PLANEACION' ? 'selected' : ''}>Planeación</option>
                        <option value="EN_DESARROLLO" ${row.estado === 'EN_DESARROLLO' ? 'selected' : ''}>En Desarrollo</option>
                        <option value="BETA" ${row.estado === 'BETA' ? 'selected' : ''}>Beta</option>
                        <option value="FINALIZADO" ${row.estado === 'FINALIZADO' ? 'selected' : ''}>Finalizado</option>
                    </select>
                </label>
            </div>
            ${clientSelect}
        `;
    }

    if (view === 'purchases') {
        const games = (can('VIDEOGAME_READ') || can('PRODUCT_READ')) ? (await allPages('/api/videogames')) : [];
        const gameSelect = games.length
            ? `
                <label>
                    Videojuego
                    <select name="videojuego" required>
                        <option value="">Selecciona un videojuego</option>
                        ${games.map(g => `<option value="${g.id}" ${row.videojuego === g.id ? 'selected' : ''}>${esc(g.titulo)} · #${g.id}</option>`).join('')}
                    </select>
                </label>
            `
            : field('ID del videojuego', 'videojuego', row.videojuego, 'number', 'required min="1" step="1"');

        body = gameSelect +
            field('Descripción', 'descripcion', row.descripcion, 'text', 'required') +
            field('Proveedor', 'proveedor', row.proveedor, 'text', 'required') +
            field('Costo', 'costo', row.costo ?? '', 'number', 'required min="0.01" step="0.01"');
    }

    if (view === 'sales') {
        const games = (can('VIDEOGAME_READ') || can('PRODUCT_READ')) ? (await allPages('/api/videogames')) : [];
        const gameSelect = games.length
            ? `
                <label>
                    Videojuego
                    <select name="videojuego" required>
                        <option value="">Selecciona un videojuego</option>
                        ${games.map(g => `<option value="${g.id}" ${row.videojuego === g.id ? 'selected' : ''}>${esc(g.titulo)} · #${g.id}</option>`).join('')}
                    </select>
                </label>
            `
            : field('ID del videojuego', 'videojuego', row.videojuego, 'number', 'required min="1" step="1"');

        body = gameSelect +
            field('Concepto', 'concepto', row.concepto, 'text', 'required') +
            field('Monto', 'monto', row.monto ?? '', 'number', 'required min="0.01" step="0.01"');
    }

    if (view === 'users') {
        body = field('Usuario', 'username', row.username, 'text', `required maxlength="50" ${edit ? 'readonly' : ''}`) +
            field('Correo', 'email', row.email, 'email', 'required maxlength="200"') +
            field(edit ? 'Nueva contraseña (opcional)' : 'Contraseña', 'password', '', 'password', `${edit ? '' : 'required'} autocomplete="new-password"`) + `
            <div class="fields">
                ${check('Cuenta bloqueada', 'locked', row.locked)}
                ${check('Cuenta deshabilitada', 'disabled', row.disabled)}
            </div>
        `;

        if (!edit && can('ROLE_ASSIGN')) {
            body += await picker('role', 'Rol de la cuenta', 'role');
        }
        body += '<p class="note">Los permisos adicionales se gestionan desde la acción «Dar permiso». Editar datos no cambia el rol.</p>';
    }

    if (view === 'roles') {
        body = field('Nombre del rol', 'name', '', 'text', 'required maxlength="50" pattern="[A-Za-z][A-Za-z0-9_]{0,49}"');
        if (can('PERMISSION_MANAGE')) {
            body += `
                <label>Permisos iniciales</label>
                <div class="checks">
                    ${(await api('/api/permissions')).map(v => `
                        <label>
                            <input type="checkbox" name="permissions" value="${esc(v)}">
                            ${esc(v)}
                        </label>
                    `).join('')}
                </div>
            `;
        }
        body += '<p class="note">El rol puede comenzar sin permisos. Después podrás asignarlo a un usuario.</p>';
    }

    if (view === 'permissions') {
        body = field('Nombre del permiso', 'name', '', 'text', 'required maxlength="50" pattern="[A-Za-z][A-Za-z0-9_]{0,49}"') +
            '<p class="note">Crear un permiso lo registra en el catálogo. La operación correspondiente debe comprobarlo en el servidor.</p>';
    }

    if (askId) {
        body = field('Identificador del registro', 'recordId', '', 'number', 'required min="1" step="1"') + body;
    }

    const isFeminine = ['purchases', 'sales'].includes(view);
    modal((edit ? 'Editar ' : (isFeminine ? 'Nueva ' : 'Nuevo ')) + ({
        clients: 'cliente',
        videogames: 'videojuego',
        purchases: 'compra',
        sales: 'venta',
        users: 'usuario',
        roles: 'rol',
        permissions: 'permiso'
    }[view]), body, async f => {
        let data = Object.fromEntries(f);
        const recordId = askId ? data.recordId : row.id;
        delete data.recordId;


        if (['videogames', 'purchases', 'sales'].includes(view)) {
            if (data.clienteId) data.clienteId = Number(data.clienteId);
            else delete data.clienteId;

            if (data.videojuego) data.videojuego = Number(data.videojuego);
            if (data.costo) data.costo = Number(data.costo);
            if (data.monto) data.monto = Number(data.monto);
        }
        if (view === 'users') {
            data.locked = f.has('locked');
            data.disabled = f.has('disabled');
            if (edit && !data.password) delete data.password;
        }
        if (view === 'roles' && can('PERMISSION_MANAGE')) {
            data.permissions = f.getAll('permissions');
        }

        const url = view === 'users'
            ? (edit ? '/api/user/update' : '/api/user/add')
            : view === 'roles'
                ? '/api/roles'
                : view === 'permissions'
                    ? '/api/permissions'
                    : sections[view].endpoint + (edit ? '/' + recordId : '');

        await api(url, { method: edit ? 'PUT' : 'POST', body: data });
    });
}

function confirmAction(title, message, run) {
    modal(title, `<p>${esc(message)}</p>`, run, 'Confirmar');
}

async function userRole(row) {
    modal(
        'Asignar rol',
        field('Usuario', 'username', row?.username || '', 'text', 'required') +
        await picker('role', 'Rol único', 'role', row?.role) +
        '<p class="note">Reemplaza el rol actual y conserva los permisos individuales.</p>',
        f => api('/api/user/assignRole', { method: 'POST', body: Object.fromEntries(f) })
    );
}

async function userPermission(row) {
    modal(
        'Dar permiso individual',
        field('Usuario', 'username', row?.username || '', 'text', 'required') +
        await picker('permission', 'Permiso adicional', 'permission') +
        '<p class="note">Se suma a los permisos del rol sin cambiarlo.</p>',
        f => api('/api/user/assignPermission', { method: 'POST', body: Object.fromEntries(f) })
    );
}

async function userDetails(row) {
    const d = await api(`/api/user/${path(row.username)}/permissions`);
    modal(
        'Permisos de ' + d.username,
        `
            <p class="note">Rol: <b>${esc(d.role)}</b></p>
            <div class="permission-group">
                <h3>Heredados del rol</h3>
                ${chips(d.rolePermissions)}
            </div>
            <div class="permission-group">
                <h3>Permisos individuales</h3>
                ${(d.additionalPermissions || []).map(p => `
                    <div class="info-row">
                        <span>${esc(p)}</span>${can('PERMISSION_ASSIGN') ? button('revoke-user-permission', 'Retirar', `data-username="${esc(d.username)}" data-permission="${esc(p)}"`, 'link-button') : ''}
                    </div>
                `).join('') || '<small>No tiene permisos adicionales.</small>'}
            </div>
            <div class="permission-group">
                <h3>Acceso efectivo</h3>
                ${chips(d.effectivePermissions)}
            </div>
        `,
        null
    );
}

async function rolePermissions(row) {
    const p = await picker('permission', 'Permiso', 'permission');
    modal(
        'Permisos de ' + row.name,
        `
            <p class="note">Estos permisos se aplican a todos los usuarios con el rol ${esc(row.name)}.</p>
            ${p}
            <label>
                Operación
                <select name="operation">
                    <option value="PUT">Agregar al rol</option>
                    <option value="DELETE">Retirar del rol</option>
                </select>
            </label>
            <div class="permission-group">
                <h3>Permisos actuales</h3>
                ${chips(row.permissions)}
            </div>
        `,
        f => api(`/api/roles/${path(row.name)}/permissions/${path(f.get('permission'))}`, { method: f.get('operation') })
    );
}

async function allPages(endpoint) {
    const out = [];
    for (let page = 0; ; page++) {
        const d = await api(`${endpoint}?page=${page}&size=100`);
        out.push(...d.content);
        if (page + 1 >= d.totalPages) break;
        if (page >= 99) {
            throw new Error('Hay demasiados registros para este selector. Usa los identificadores manualmente.');
        }
    }
    return out;
}

async function purchaseDetails(row) {
    const d = await api('/api/purchases/' + row.id);
    modal(
        'Compra #' + d.id,
        `
            <div class="info-row"><span>Videojuego</span><b>${esc(d.videojuegoTitulo)}</b></div>
            <div class="info-row"><span>Proveedor</span><b>${esc(d.proveedor)}</b></div>
            <div class="info-row"><span>Descripción</span><b>${esc(d.descripcion)}</b></div>
            <div class="info-row"><span>Registrada por</span><b>${esc(d.usuarioUsername)}</b></div>
            <div class="info-row"><span>Fecha</span><b>${esc(date(d.fecha))}</b></div>
            <div class="totals">
                <span>Costo registrado</span><b>${money(d.costo)}</b>
            </div>
        `,
        null
    );
}

async function saleDetails(row) {
    const d = await api('/api/sales/' + row.id);
    modal(
        'Venta #' + d.id,
        `
            <div class="info-row"><span>Videojuego</span><b>${esc(d.videojuegoTitulo)}</b></div>
            <div class="info-row"><span>Concepto</span><b>${esc(d.concepto)}</b></div>
            <div class="info-row"><span>Registrada por</span><b>${esc(d.usuarioUsername)}</b></div>
            <div class="info-row"><span>Fecha</span><b>${esc(date(d.fecha))}</b></div>
            <div class="totals">
                <span>Monto registrado</span><b>${money(d.monto)}</b>
            </div>
        `,
        null
    );
}

async function handle(action, element) {
    const row = state.rows[Number(element.dataset.index)];

    switch (action) {
        case 'go':
            return navigate(element.dataset.view);

        case 'reload':
            await refreshMe();
            return navigate(state.view, state.page);

        case 'previous':
            return navigate(state.view, state.page - 1);

        case 'next':
            return navigate(state.view, state.page + 1);

        case 'create':
            return entityForm();

        case 'edit':
            return entityForm(row);

        case 'edit-business-id':
            return entityForm({}, true);

        case 'deactivate-business-id':
            modal(
                'Desactivar registro',
                field('Identificador', 'id', '', 'number', 'required min="1" step="1"') +
                '<p class="note">El registro quedará inactivo. Se conservará el historial.</p>',
                f => api(sections[state.view].endpoint + '/' + path(f.get('id')), { method: 'DELETE' }),
                'Desactivar'
            );
            return;

        case 'cancel-sale-id':
            modal(
                'Anular venta',
                field('Identificador de venta', 'id', '', 'number', 'required min="1" step="1"'),
                f => api('/api/sales/' + path(f.get('id')), { method: 'DELETE' }),
                'Anular venta'
            );
            return;

        case 'revoke-permission-id':
            modal(
                'Retirar permiso individual',
                field('Usuario', 'username', '', 'text', 'required') +
                await picker('permission', 'Permiso individual', 'permission') +
                '<p class="note">Los permisos heredados del rol permanecerán activos.</p>',
                f => api(`/api/user/${path(f.get('username'))}/permissions/${path(f.get('permission'))}`, { method: 'DELETE' }),
                'Retirar permiso'
            );
            return;

        case 'edit-named':
            modal(
                'Actualizar cuenta',
                field('Usuario', 'username', '', 'text', 'required') +
                field('Nuevo correo (opcional)', 'email', '', 'email') +
                field('Nueva contraseña (opcional)', 'password', '', 'password') +
                `
                    <label>
                        Estado
                        <select name="status">
                            <option value="">Conservar estado</option>
                            <option value="enabled">Habilitar y desbloquear</option>
                            <option value="disabled">Deshabilitar</option>
                            <option value="locked">Bloquear</option>
                        </select>
                    </label>
                `,
                f => {
                    const data = { username: f.get('username') };
                    if (f.get('email')) data.email = f.get('email');
                    if (f.get('password')) data.password = f.get('password');
                    if (f.get('status') === 'enabled') {
                        data.locked = false;
                        data.disabled = false;
                    }
                    if (f.get('status') === 'disabled') data.disabled = true;
                    if (f.get('status') === 'locked') data.locked = true;
                    return api('/api/user/update', { method: 'PUT', body: data });
                }
            );
            return;

        case 'delete-named':
            modal(
                'Eliminar cuenta',
                field('Usuario', 'username', '', 'text', 'required') +
                '<p class="note">La cuenta se eliminará permanentemente.</p>',
                f => api('/api/user/delete/' + path(f.get('username')), { method: 'DELETE' }),
                'Eliminar'
            );
            return;

        case 'deactivate':
            return confirmAction(
                'Eliminar / Desactivar registro',
                `¿Desactivar/Eliminar el registro seleccionado?`,
                () => api(sections[state.view].endpoint + '/' + row.id, { method: 'DELETE' })
            );

        case 'delete-user':
            return confirmAction(
                'Eliminar usuario',
                `¿Eliminar permanentemente la cuenta ${row.username}?`,
                () => api('/api/user/delete/' + path(row.username), { method: 'DELETE' })
            );

        case 'user-role':
            return userRole(row);

        case 'user-permission':
            return userPermission(row);

        case 'user-detail':
            return userDetails(row);

        case 'role-permission':
            return rolePermissions(row);

        case 'cancel-sale':
            return confirmAction(
                'Anular venta',
                `¿Anular la venta #${row.id}?`,
                () => api('/api/sales/' + row.id, { method: 'DELETE' })
            );

        case 'delete-purchase':
            return confirmAction(
                'Eliminar compra',
                `¿Eliminar la compra #${row.id}?`,
                () => api('/api/purchases/' + row.id, { method: 'DELETE' })
            );

        case 'sale-detail':
            return saleDetails(row);

        case 'purchase-detail':
            return purchaseDetails(row);

        case 'revoke-user-permission':
            return confirmAction(
                'Retirar permiso individual',
                `¿Retirar ${element.dataset.permission} de ${element.dataset.username}? Los permisos heredados se conservan.`,
                () => api(`/api/user/${path(element.dataset.username)}/permissions/${path(element.dataset.permission)}`, { method: 'DELETE' })
            );
    }
}

async function onAction(e) {
    const b = e.target.closest('[data-action]');
    if (!b || b.disabled) return;
    b.disabled = true;

    try {
        await handle(b.dataset.action, b);
    } catch (error) {
        toast(error.message, true);
    } finally {
        b.disabled = false;
    }
}

$('#content').addEventListener('click', onAction);
$('#modal-body').addEventListener('click', onAction);

$('#content').addEventListener('input', e => {
    if (e.target.id !== 'filter') return;
    const term = e.target.value.toLocaleLowerCase();
    let shown = 0;

    $('#content').querySelectorAll('tbody tr').forEach(row => {
        row.hidden = !row.textContent.toLocaleLowerCase().includes(term);
        if (!row.hidden) shown++;
    });

    $('#empty-table').hidden = shown > 0;
    $('#empty-table').textContent = term ? 'No hay coincidencias en esta página.' : 'Aún no hay registros.';
});

$('#session-button').onclick = async () => {
    try {
        await refreshMe();
        modal(
            'Mi espacio',
            `
                <div class="info-row"><span>Usuario</span><b>${esc(state.me.username)}</b></div>
                <div class="info-row"><span>Rol</span><b>${esc(state.me.role)}</b></div>
                <div class="permission-group">
                    <h3>Permisos de mi sesión</h3>
                    ${chips(state.me.effectivePermissions)}
                </div>
            `,
            null
        );
    } catch (error) {
        toast(error.message, true);
        logout();
    }
};

if (state.token) {
    enter().catch(() => {
        logout();
        toast('Inicia sesión nuevamente para continuar.', true);
    });
}
