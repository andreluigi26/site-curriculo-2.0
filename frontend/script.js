const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE)
    ? window.APP_CONFIG.API_BASE
    : 'https://site-curriculo-api.vercel.app';
const URL_API = `${API_BASE}/projetos`;
const LAST_SECTION_KEY = 'portfolio_last_section';

function linkExternoValido(url) {
    try {
        const valor = String(url || '').trim();
        if (!valor) {
            return false;
        }

        const parsed = new URL(valor);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function formatarDescricaoProjeto(descricao) {
    const valor = String(descricao || '').trim();
    if (!valor || /^descricao em breve\.?$/i.test(valor)) {
        return 'Projeto em evolucao. Em breve adicionarei uma descricao completa com mais detalhes.';
    }

    return valor;
}

async function carregarProjetos()  {
    try {
        const resposta = await fetch(URL_API);
        if (!resposta.ok) {
            throw new Error(`Falha ao carregar projetos: ${resposta.status}`);
        }

        const projetos = await resposta.json();
        const container = document.getElementById('lista-projetos');

        if (!container) {
            return;
        }

        if (!projetos.length) {
            container.innerHTML = '<p class="empty">Nenhum projeto cadastrado ainda.</p>';
            return;
        }

        const projetosGithub = projetos.filter((projeto) => (
            Boolean(projeto.githubRepoId)
            || /github\.com/i.test(projeto.linkGithub || '')
        ));

        const projetosRecentes = [...projetosGithub].sort((a, b) => {
            const idA = Number(a.githubRepoId || 0);
            const idB = Number(b.githubRepoId || 0);
            if (idA !== idB) {
                return idB - idA;
            }

            const _idA = String(a._id || '');
            const _idB = String(b._id || '');
            return _idB.localeCompare(_idA);
        }).slice(0, 3);

        if (!projetosRecentes.length) {
            container.innerHTML = '<p class="empty">Nenhum projeto do GitHub encontrado.</p>';
            return;
        }

        container.innerHTML = projetosRecentes.map((projeto) => {
            const descricao = formatarDescricaoProjeto(projeto.descricao);
            const linkGithub = linkExternoValido(projeto.linkGithub)
                ? `<a href="${projeto.linkGithub}" target="_blank" rel="noreferrer">GitHub</a>`
                : '';

            return `
                <div class="projeto-card">
                    <div class="projeto-info">
                        <h3>${projeto.titulo || 'Projeto sem titulo'}</h3>
                        <p>${descricao}</p>
                        ${linkGithub ? `<div class="links">${linkGithub}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        requestAnimationFrame(() => {
            ajustarAlturaTabAtiva();
        });
    } catch (error) {
        console.error('Erro ao carregar projetos:', error);
        const container = document.getElementById('lista-projetos');
        if (container) {
            container.innerHTML = '<p class="erro">Nao foi possivel carregar os projetos agora.</p>';
        }

        requestAnimationFrame(() => {
            ajustarAlturaTabAtiva();
        });
    }
}

const body = document.querySelector('body');
const conteudo = document.getElementById('conteudo');

let rafMouse = null;
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (evento) => {
    mouseX = evento.clientX;
    mouseY = evento.clientY;
    if (rafMouse) {
        return;
    }
    rafMouse = requestAnimationFrame(() => {
        body.style.background = `
            radial-gradient(circle 450px at ${mouseX}px ${mouseY}px, rgba(110, 231, 210, 0.08), transparent 40%),
            radial-gradient(circle at 20% 20%, rgba(110, 231, 210, 0.14), transparent 32%),
            radial-gradient(circle at 85% 12%, rgba(134, 196, 255, 0.12), transparent 35%),
            linear-gradient(180deg, #0a1628 0%, #08111f 100%)
        `;
        rafMouse = null;
    });
});

const secoes = document.querySelectorAll('main section[id]');
const links = document.querySelectorAll('.nav-links a');

function isDesktopTabs() {
    return window.innerWidth >= 1024;
}

function atualizarLinkAtivo(sectionId) {
    links.forEach((link) => {
        const ativa = link.getAttribute('data-section') === sectionId;
        link.classList.toggle('is-active', ativa);
    });
}

function ajustarAlturaTabAtiva() {
    // altura gerenciada automaticamente via display: none/block
}

function ativarSecaoDesktop(sectionId) {
    if (!conteudo) {
        return;
    }

    conteudo.classList.add('tab-mode');

    secoes.forEach((secao) => {
        const visivel = secao.id === sectionId;
        secao.classList.toggle('is-visible', visivel);
    });

    ajustarAlturaTabAtiva();

    atualizarLinkAtivo(sectionId);
    localStorage.setItem(LAST_SECTION_KEY, sectionId);
}

function desativarSecaoDesktop() {
    if (!conteudo) {
        return;
    }

    conteudo.classList.remove('tab-mode');
    conteudo.style.minHeight = '';
    secoes.forEach((secao) => secao.classList.remove('is-visible'));
}

function configurarModoNavegacao() {
    if (!secoes.length) {
        return;
    }

    if (isDesktopTabs()) {
        // Carrega vazio no desktop: conteúdo aparece só após clique.
        conteudo.classList.add('tab-mode');
        secoes.forEach((secao) => secao.classList.remove('is-visible'));
        atualizarLinkAtivo('');
        return;
    }

    desativarSecaoDesktop();
}

const observer = new IntersectionObserver((entradas) => {
    if (isDesktopTabs()) {
        return;
    }

    entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) {
            return;
        }

        atualizarLinkAtivo(entrada.target.id);
    });
}, {
    rootMargin: '-30% 0px -55% 0px',
    threshold: 0.01,
});

secoes.forEach((secao) => observer.observe(secao));

links.forEach((link) => {
    link.addEventListener('click', (event) => {
        const sectionId = link.getAttribute('data-section');
        if (!sectionId) {
            return;
        }

        if (isDesktopTabs()) {
            event.preventDefault();
            ativarSecaoDesktop(sectionId);
            window.history.replaceState(null, '', `#${sectionId}`);
        }
    });
});

window.addEventListener('resize', configurarModoNavegacao);

configurarModoNavegacao();
carregarProjetos();
