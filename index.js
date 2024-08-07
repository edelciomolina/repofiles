//FIX https://chatgpt.com/c/cbca2726-6477-4465-93bb-d05993124e96

(async () => {
    try {
        // Importa as bibliotecas necessárias
        const { Octokit } = await import('@octokit/rest');
        const { GITHUB } = await import('./credentials.js');
        const { default: axios } = await import('axios');

        // Crie uma instância do Octokit com seu token de acesso pessoal
        const octokit = new Octokit({ auth: GITHUB.GITHUB_ACCESS_TOKEN });

        function extractLinks(text) {
            // Regex para capturar URLs em Markdown, HTML e URLs isoladas
            const regex = /(?:!\[.*?\]\((https?:\/\/[^\s"'()]+)\))|(?:<img\s+[^>]*src=["'](https?:\/\/[^\s"'()]+)["'])|(?:\b(https?:\/\/[^\s"'()]+)\b)/g;
            const matches = [];
            let match;
            while ((match = regex.exec(text)) !== null) {
                if (match[1]) {
                    matches.push(match[1]);
                }
                if (match[2]) {
                    matches.push(match[2]);
                }
                if (match[3]) {
                    matches.push(match[3]);
                }
            }
            return matches;
        }

        // Função para obter o tipo de arquivo a partir do cabeçalho da resposta
        async function getFileType(url) {
            try {
                // Primeiro, tente obter os cabeçalhos com uma solicitação HEAD
                const response = await axios.head(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': '*/*',
                    }
                });

                const contentType = response.headers['content-type'];
                return contentType || 'unknown';
            } catch (headError) {
                // Se a solicitação HEAD falhar, tente uma solicitação GET com Range
                try {
                    const response = await axios.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept': '*/*',
                            'Range': 'bytes=0-1023' // Solicita apenas os primeiros 1024 bytes
                        }
                    });

                    const contentType = response.headers['content-type'];
                    return contentType || 'unknown';
                } catch (getError) {
                    return 'unknown';
                }
            }
        }

        // Função principal para processar links do texto
        async function processText(text) {
            const links = extractLinks(text);
            for (const link of links) {
                const fileType = await getFileType(link);
                console.log(`Link: ${link} | Tipo de Arquivo: ${fileType}`);
            }
        }

        // Função para processar corpo da issue e comentários
        async function processIssue(issue) {
            console.log(`#${issue.number} - ${issue.title}`);

            // Processa o corpo da issue
            await processText(issue.body);

            // Obtém e processa os comentários da issue
            const commentsResponse = await octokit.issues.listComments({
                owner: GITHUB.OWNER,
                repo: GITHUB.REPO,
                issue_number: issue.number
            });

            for (const comment of commentsResponse.data) {
                await processText(comment.body);
            }
        }

        async function listIssues() {
            try {
                // Substitua 'owner' pelo nome do proprietário do repositório e 'repo' pelo nome do repositório
                const issuesResponse = await octokit.issues.listForRepo({
                    owner: GITHUB.OWNER,
                    repo: GITHUB.REPO,
                });

                // Processa cada issue encontrada
                for (const issue of issuesResponse.data) {
                    await processIssue(issue);
                }

            } catch (error) {
                console.error('Erro ao listar as issues:', error);
            }
        }

        // Chamada da função para listar issues
        await listIssues();
    } catch (error) {
        console.error('Erro ao importar a biblioteca:', error);
    }
})();
