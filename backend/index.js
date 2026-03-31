const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const Projeto = require('./models/Projeto');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || '';

const allowedOrigins = FRONTEND_URL
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5500', 'http://127.0.0.1:5500');
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origem nao permitida pelo CORS'));
    },
}));
app.use(express.json());

if (!MONGODB_URI) {
    console.error('Variavel MONGODB_URI nao definida. Configure o arquivo .env no backend.');
    process.exit(1);
}

function obterTecnologias(repo) {
    const tecnologias = new Set();

    if (repo.language) {
        tecnologias.add(repo.language);
    }

    if (Array.isArray(repo.topics)) {
        repo.topics.slice(0, 5).forEach((topic) => tecnologias.add(topic));
    }

    return [...tecnologias];
}

function gerarTokenAdmin() {
    return jwt.sign(
        { role: 'admin', username: ADMIN_USERNAME },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
}

function autenticarAdmin(req, res, next) {
    if (!JWT_SECRET) {
        return res.status(500).json({ message: 'JWT_SECRET nao configurado no servidor.' });
    }

    const authHeader = req.header('authorization') || '';
    const [, token] = authHeader.split(' ');

    if (!token) {
        return res.status(401).json({ message: 'Token de administrador ausente.' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        req.admin = payload;
        return next();
    } catch (err) {
        return res.status(401).json({ message: 'Token invalido ou expirado.' });
    }
}

app.post('/admin/login', (req, res) => {
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !JWT_SECRET) {
        return res.status(500).json({ message: 'Credenciais admin nao configuradas no servidor.' });
    }

    const { username, password } = req.body;
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Usuario ou senha invalidos.' });
    }

    const token = gerarTokenAdmin();
    return res.json({ token });
});

app.get('/admin/validate', autenticarAdmin, (req, res) => {
    res.json({ ok: true, username: req.admin.username });
});

app.get('/projetos', async (req, res) => {
    try {
        const projetos = await Projeto.find();
        res.json(projetos);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/projetos', autenticarAdmin, async (req, res) => {
    try {
        const { titulo, descricao, tecnologias, tecnologia, linkProjeto, linkGithub, destaque } = req.body;
        const listaTecnologias = Array.isArray(tecnologias)
            ? tecnologias
            : (tecnologia ? [tecnologia] : []);

        const novoProjeto = new Projeto({
            titulo,
            descricao,
            tecnologias: listaTecnologias,
            linkProjeto,
            linkGithub,
            destaque
        });
        const projetoSalvo = await novoProjeto.save();
        res.status(201).json(projetoSalvo);
    } catch (err) {        res.status(400).json({ message: `Erro ao salvar projeto: ${err.message}` });
    }
});

app.put('/projetos/:id', autenticarAdmin, async (req, res) => {
    try {
        const { titulo, descricao, tecnologias, tecnologia, linkProjeto, linkGithub, destaque } = req.body;
        const listaTecnologias = Array.isArray(tecnologias)
            ? tecnologias
            : (tecnologia ? [tecnologia] : []);

        const projetoAtualizado = await Projeto.findByIdAndUpdate(
            req.params.id,
            {
                titulo,
                descricao,
                tecnologias: listaTecnologias,
                linkProjeto,
                linkGithub,
                destaque: Boolean(destaque),
            },
            { new: true, runValidators: true }
        );

        if (!projetoAtualizado) {
            return res.status(404).json({ message: 'Projeto nao encontrado.' });
        }

        return res.json(projetoAtualizado);
    } catch (err) {
        return res.status(400).json({ message: `Erro ao atualizar projeto: ${err.message}` });
    }
});

app.delete('/projetos/:id', autenticarAdmin, async (req, res) => {
    try {
        const projetoRemovido = await Projeto.findByIdAndDelete(req.params.id);
        if (!projetoRemovido) {
            return res.status(404).json({ message: 'Projeto nao encontrado.' });
        }

        return res.json({ message: 'Projeto removido com sucesso.' });
    } catch (err) {
        return res.status(400).json({ message: `Erro ao remover projeto: ${err.message}` });
    }
});

app.post('/sync-github', autenticarAdmin, async (req, res) => {
    if (!GITHUB_USERNAME) {
        return res.status(500).json({ message: 'GITHUB_USERNAME nao configurado no servidor.' });
    }

    try {
        const headers = {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'site-curriculo-sync',
        };

        if (GITHUB_TOKEN) {
            headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
        }

        const resposta = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`, {
            headers,
        });

        if (!resposta.ok) {
            const detalhe = await resposta.text();
            return res.status(502).json({
                message: 'Falha ao consultar a API do GitHub.',
                status: resposta.status,
                detalhe,
            });
        }

        const repositorios = await resposta.json();
        const reposPublicos = repositorios.filter((repo) => !repo.fork && !repo.private);

        let criados = 0;
        let atualizados = 0;

        for (const repo of reposPublicos) {
            const dadosProjeto = {
                githubRepoId: repo.id,
                githubRepoName: repo.name,
                titulo: repo.name.replace(/[-_]/g, ' '),
                descricao: repo.description || 'Descricao em breve.',
                tecnologias: obterTecnologias(repo),
                linkProjeto: repo.homepage || '',
                linkGithub: repo.html_url,
            };

            const existente = await Projeto.findOne({ githubRepoId: repo.id });
            if (existente) {
                await Projeto.updateOne({ _id: existente._id }, { $set: dadosProjeto });
                atualizados += 1;
            } else {
                await Projeto.create(dadosProjeto);
                criados += 1;
            }
        }

        return res.json({
            message: 'Sincronizacao concluida com sucesso.',
            githubUsername: GITHUB_USERNAME,
            repositoriosLidos: reposPublicos.length,
            criados,
            atualizados,
        });
    } catch (err) {
        return res.status(500).json({ message: `Erro na sincronizacao: ${err.message}` });
    }
});

async function iniciarServidor() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado ao MongoDB');

        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    } catch (err) {
        console.error('Erro ao conectar ao MongoDB:', err);
        process.exit(1);
    }
}

iniciarServidor();