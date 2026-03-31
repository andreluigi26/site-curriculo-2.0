const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE)
    ? window.APP_CONFIG.API_BASE
    : 'https://site-curriculo-api.vercel.app';
const TOKEN_KEY = 'admin_token';

const loginCard = document.getElementById('login-card');
const panelCard = document.getElementById('panel-card');
const loginForm = document.getElementById('admin-login-form');
const loginStatus = document.getElementById('admin-login-status');
const syncStatus = document.getElementById('admin-sync-status');
const projetoForm = document.getElementById('admin-projeto-form');
const projetosContainer = document.getElementById('admin-projetos');
const btnSync = document.getElementById('btn-sync');
const btnLogout = document.getElementById('btn-logout');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const projetoFormTitle = projetoForm.querySelector('h2');
const projetoSubmitBtn = projetoForm.querySelector('button[type="submit"]');

let projetoEmEdicaoId = null;

function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
    sessionStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
}

async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message = payload?.message || payload || `Erro ${response.status}`;
        throw new Error(message);
    }

    return payload;
}

function toggleAdminUI(isLogged) {
    loginCard.classList.toggle('hidden', isLogged);
    panelCard.classList.toggle('hidden', !isLogged);
}

function resetarFormularioProjeto() {
    projetoEmEdicaoId = null;
    projetoForm.reset();
    projetoFormTitle.textContent = 'Novo Projeto';
    projetoSubmitBtn.textContent = 'Salvar Projeto';
    btnCancelEdit.classList.add('hidden');
}

function preencherFormularioEdicao(projeto) {
    projetoEmEdicaoId = projeto._id;
    projetoFormTitle.textContent = 'Editar Projeto';
    projetoSubmitBtn.textContent = 'Atualizar Projeto';
    btnCancelEdit.classList.remove('hidden');

    document.getElementById('titulo').value = projeto.titulo || '';
    document.getElementById('descricao').value = projeto.descricao || '';
    document.getElementById('tecnologias').value = (projeto.tecnologias || []).join(', ');
    document.getElementById('linkProjeto').value = projeto.linkProjeto || '';
    document.getElementById('linkGithub').value = projeto.linkGithub || '';
    document.getElementById('destaque').checked = Boolean(projeto.destaque);

    projetoForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderProjetos(projetos) {
    if (!projetos.length) {
        projetosContainer.innerHTML = '<p class="admin-status">Nenhum projeto cadastrado.</p>';
        return;
    }

    const projetosPorId = new Map(projetos.map((projeto) => [String(projeto._id), projeto]));

    projetosContainer.innerHTML = projetos.map((projeto) => `
        <article class="admin-projeto-item">
            <div>
                <h3>${projeto.titulo || 'Sem titulo'}</h3>
                <p>${projeto.descricao || ''}</p>
                <small>${(projeto.tecnologias || []).join(', ')}</small>
            </div>
            <div class="admin-projeto-acoes">
                <button type="button" data-id="${projeto._id}" class="btn-outline btn-edit">Editar</button>
                <button type="button" data-id="${projeto._id}" class="btn-outline btn-delete">Excluir</button>
            </div>
        </article>
    `).join('');

    document.querySelectorAll('.btn-edit').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = String(btn.getAttribute('data-id') || '');
            const projeto = projetosPorId.get(id);
            if (!projeto) {
                syncStatus.textContent = 'Erro: projeto nao encontrado para edicao.';
                return;
            }

            preencherFormularioEdicao(projeto);
            syncStatus.textContent = 'Modo edicao ativado.';
        });
    });

    document.querySelectorAll('.btn-delete').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = String(btn.getAttribute('data-id') || '');
            if (!window.confirm('Deseja remover este projeto?')) {
                return;
            }

            try {
                await api(`/projetos/${id}`, { method: 'DELETE' });
                if (projetoEmEdicaoId === id) {
                    resetarFormularioProjeto();
                }
                await carregarProjetosAdmin();
            } catch (err) {
                syncStatus.textContent = `Erro: ${err.message}`;
            }
        });
    });
}

async function carregarProjetosAdmin() {
    const projetos = await api('/projetos');
    renderProjetos(projetos);
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginStatus.textContent = 'Validando...';

    const formData = new FormData(loginForm);
    const username = String(formData.get('username') || '');
    const password = String(formData.get('password') || '');

    try {
        const data = await api('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        setToken(data.token);
        loginStatus.textContent = '';
        loginForm.reset();
        toggleAdminUI(true);
        await carregarProjetosAdmin();
    } catch (err) {
        loginStatus.textContent = `Erro: ${err.message}`;
    }
});

projetoForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    syncStatus.textContent = 'Salvando projeto...';

    const formData = new FormData(projetoForm);
    const tecnologias = String(formData.get('tecnologias') || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const payload = {
        titulo: String(formData.get('titulo') || '').trim(),
        descricao: String(formData.get('descricao') || '').trim(),
        tecnologias,
        linkProjeto: String(formData.get('linkProjeto') || '').trim(),
        linkGithub: String(formData.get('linkGithub') || '').trim(),
        destaque: Boolean(formData.get('destaque')),
    };

    try {
        const emEdicao = Boolean(projetoEmEdicaoId);
        await api(emEdicao ? `/projetos/${projetoEmEdicaoId}` : '/projetos', {
            method: emEdicao ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        syncStatus.textContent = emEdicao
            ? 'Projeto atualizado com sucesso.'
            : 'Projeto salvo com sucesso.';
        resetarFormularioProjeto();
        await carregarProjetosAdmin();
    } catch (err) {
        syncStatus.textContent = `Erro: ${err.message}`;
    }
});

btnCancelEdit.addEventListener('click', () => {
    resetarFormularioProjeto();
    syncStatus.textContent = 'Edicao cancelada.';
});

btnSync.addEventListener('click', async () => {
    syncStatus.textContent = 'Sincronizando com GitHub...';
    btnSync.disabled = true;

    try {
        const resultado = await api('/sync-github', { method: 'POST' });
        syncStatus.textContent = `Sync concluida: ${resultado.criados} criados, ${resultado.atualizados} atualizados.`;
        await carregarProjetosAdmin();
    } catch (err) {
        syncStatus.textContent = `Erro: ${err.message}`;
    } finally {
        btnSync.disabled = false;
    }
});

btnLogout.addEventListener('click', () => {
    clearToken();
    toggleAdminUI(false);
    syncStatus.textContent = '';
    projetosContainer.innerHTML = '';
});

async function iniciar() {
    const token = getToken();
    if (!token) {
        toggleAdminUI(false);
        return;
    }

    try {
        await api('/admin/validate');
        toggleAdminUI(true);
        await carregarProjetosAdmin();
    } catch {
        clearToken();
        toggleAdminUI(false);
    }
}

resetarFormularioProjeto();
iniciar();
