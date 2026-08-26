import axios from 'axios';

export interface AuditResult {
  hasWebsite: boolean;
  status: 'online' | 'offline' | 'error' | 'no_website';
  statusCode?: number;
  isHttps?: boolean;
  responseTimeMs?: number;
  leadScore: 'Alta' | 'Média' | 'Baixa';
  opportunityTags: string[];
  reasonExplanation: string;
}

export async function auditWebsite(websiteUrl?: string | null): Promise<AuditResult> {
  if (!websiteUrl || websiteUrl.trim() === '' || websiteUrl.toLowerCase() === 'n/a' || websiteUrl.toLowerCase() === 'none') {
    return {
      hasWebsite: false,
      status: 'no_website',
      leadScore: 'Alta',
      opportunityTags: ['Sem Website', 'Criação do Zero', 'Oportunidade Máxima'],
      reasonExplanation: '🚫 Empresa SEM site próprio cadastrado: Depende exclusivamente de redes sociais ou ficha do Google Maps. Oportunidade máxima para criação de site profissional, catálogo e agendamento online.'
    };
  }

  let formattedUrl = websiteUrl.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = 'http://' + formattedUrl;
  }

  const isHttps = formattedUrl.startsWith('https://');
  const startTime = Date.now();

  try {
    const response = await axios.get(formattedUrl, {
      timeout: 7000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      validateStatus: () => true
    });

    const responseTimeMs = Date.now() - startTime;
    const statusCode = response.status;

    if (statusCode >= 200 && statusCode < 400) {
      const tags: string[] = ['Site Online'];
      let leadScore: 'Alta' | 'Média' | 'Baixa' = 'Baixa';
      let reasonExplanation = '🌐 Empresa possui site ativo no ar. Potencial para oferta de redesign, e-commerce, sistema de gestão web ou automação.';

      if (!isHttps) {
        tags.push('Sem SSL (HTTP Inseguro)');
        leadScore = 'Média';
        reasonExplanation = '🔒 Site Inseguro (Sem Certificado SSL): Os navegadores exibem aviso de "Não Seguro", reduzindo a confiança e as vendas da empresa.';
      } else if (responseTimeMs > 3500) {
        tags.push('Site Lento (+3.5s)');
        leadScore = 'Média';
        reasonExplanation = '⏳ Site Muito Lento no Carregamento: Demora mais de 3.5 segundos para responder, fazendo com que muitos clientes no celular desistam.';
      }

      return {
        hasWebsite: true,
        status: 'online',
        statusCode,
        isHttps,
        responseTimeMs,
        leadScore,
        opportunityTags: tags,
        reasonExplanation
      };
    } else {
      // 4xx or 5xx
      return {
        hasWebsite: true,
        status: 'error',
        statusCode,
        isHttps,
        responseTimeMs,
        leadScore: 'Alta',
        opportunityTags: [`Erro HTTP ${statusCode}`, 'Site com Falha/Offline', 'Oportunidade de Recuperação'],
        reasonExplanation: `⚠️ Site com Erro (HTTP ${statusCode}): A página está com falha ou fora do ar. A empresa está perdendo clientes diariamente tentando acessar o link.`
      };
    }
  } catch (err: any) {
    return {
      hasWebsite: true,
      status: 'offline',
      isHttps,
      leadScore: 'Alta',
      opportunityTags: ['Site Fora do Ar / Timeout', 'Domínio Inacessível', 'Oportunidade de Redesenho'],
      reasonExplanation: '⚠️ Site Fora do Ar ou Domínio Expirado: A conexão falhou por timeout ou domínio inativo. Oportunidade quente para recuperação ou desenvolvimento de um novo site moderno.'
    };
  }
}
