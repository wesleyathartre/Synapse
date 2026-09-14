// Domínio do CRM — rótulos, cores e opções (centralizado)

// Categorias de produtos — ordem importa (aparecem agrupadas nos formulários).
// Para expandir o mercado, basta adicionar uma nova categoria aqui e produtos abaixo.
export const PRODUCT_CATEGORIES: { key: string; label: string }[] = [
  { key: 'VEICULOS', label: 'Seguros de Veículos' },
  { key: 'PATRIMONIAIS', label: 'Seguros Patrimoniais' },
  { key: 'PESSOAS', label: 'Seguros de Pessoas' },
  { key: 'DIVERSOS', label: 'Seguros Diversos' },
  { key: 'FINANCEIROS', label: 'Financeiros e Previdência' },
  { key: 'CONSORCIOS', label: 'Consórcios' },
];

type Product = { label: string; color: string; emoji: string; category: string };

// Catálogo de produtos. Chave = código armazenado no banco.
// É só adicionar novas linhas para expandir (celular, pet, náutico, etc.).
export const PRODUCTS: Record<string, Product> = {
  // Veículos
  AUTO: { label: 'Auto', color: '#2451eb', emoji: '🚗', category: 'VEICULOS' },
  MOTO: { label: 'Moto', color: '#1d4ed8', emoji: '🏍️', category: 'VEICULOS' },
  CAMINHAO: { label: 'Caminhão / Frota', color: '#0369a1', emoji: '🚚', category: 'VEICULOS' },
  NAUTICO: { label: 'Náutico', color: '#0891b2', emoji: '⛵', category: 'VEICULOS' },

  // Patrimoniais
  RESIDENCIAL: { label: 'Residencial', color: '#ea580c', emoji: '🏠', category: 'PATRIMONIAIS' },
  CONDOMINIO: { label: 'Condomínio', color: '#c2410c', emoji: '🏢', category: 'PATRIMONIAIS' },
  EMPRESARIAL: { label: 'Empresarial', color: '#7c3aed', emoji: '🏭', category: 'PATRIMONIAIS' },
  RURAL: { label: 'Rural / Agro', color: '#65a30d', emoji: '🌾', category: 'PATRIMONIAIS' },
  EQUIPAMENTOS: { label: 'Equipamentos', color: '#b45309', emoji: '🛠️', category: 'PATRIMONIAIS' },

  // Pessoas
  VIDA: { label: 'Vida', color: '#16a34a', emoji: '❤️', category: 'PESSOAS' },
  VIDA_GRUPO: { label: 'Vida em Grupo', color: '#15803d', emoji: '👨‍👩‍👧', category: 'PESSOAS' },
  ACIDENTES: { label: 'Acidentes Pessoais', color: '#dc2626', emoji: '🩹', category: 'PESSOAS' },
  SAUDE: { label: 'Saúde', color: '#0891b2', emoji: '🩺', category: 'PESSOAS' },
  ODONTO: { label: 'Odontológico', color: '#0e7490', emoji: '🦷', category: 'PESSOAS' },

  // Diversos
  CELULAR: { label: 'Celular', color: '#4f46e5', emoji: '📱', category: 'DIVERSOS' },
  PORTATEIS: { label: 'Portáteis / Eletrônicos', color: '#6366f1', emoji: '💻', category: 'DIVERSOS' },
  BIKE: { label: 'Bike', color: '#0d9488', emoji: '🚲', category: 'DIVERSOS' },
  PET: { label: 'Pet', color: '#d946ef', emoji: '🐶', category: 'DIVERSOS' },
  VIAGEM: { label: 'Viagem', color: '#db2777', emoji: '✈️', category: 'DIVERSOS' },
  GARANTIA_ESTENDIDA: { label: 'Garantia Estendida', color: '#9333ea', emoji: '🛡️', category: 'DIVERSOS' },
  FIANCA: { label: 'Fiança Locatícia', color: '#a16207', emoji: '🔑', category: 'DIVERSOS' },
  RESP_CIVIL: { label: 'Responsabilidade Civil', color: '#475569', emoji: '📋', category: 'DIVERSOS' },

  // Financeiros e Previdência
  PREVIDENCIA: { label: 'Previdência Privada', color: '#0f766e', emoji: '🏦', category: 'FINANCEIROS' },
  CAPITALIZACAO: { label: 'Capitalização', color: '#ca8a04', emoji: '💰', category: 'FINANCEIROS' },
  INVESTIMENTO: { label: 'Investimentos', color: '#059669', emoji: '📈', category: 'FINANCEIROS' },

  // Consórcios
  CONSORCIO_IMOVEL: { label: 'Consórcio Imóvel', color: '#b45309', emoji: '🏡', category: 'CONSORCIOS' },
  CONSORCIO_AUTO: { label: 'Consórcio Auto', color: '#a16207', emoji: '🚗', category: 'CONSORCIOS' },
  CONSORCIO_MOTO: { label: 'Consórcio Moto', color: '#92400e', emoji: '🏍️', category: 'CONSORCIOS' },
  CONSORCIO_PESADOS: { label: 'Consórcio Pesados', color: '#78350f', emoji: '🚛', category: 'CONSORCIOS' },
  CONSORCIO_SERVICOS: { label: 'Consórcio Serviços', color: '#854d0e', emoji: '🧾', category: 'CONSORCIOS' },
};

// Opções planas (para usos simples).
export const PRODUCT_OPTIONS = Object.entries(PRODUCTS).map(([value, v]) => ({
  value,
  label: `${v.emoji} ${v.label}`,
}));

// Opções agrupadas por categoria (para <optgroup> nos selects).
export const PRODUCT_GROUPS = PRODUCT_CATEGORIES.map((cat) => ({
  key: cat.key,
  label: cat.label,
  options: Object.entries(PRODUCTS)
    .filter(([, v]) => v.category === cat.key)
    .map(([value, v]) => ({ value, label: `${v.emoji} ${v.label}` })),
}));

// Seguradoras sugeridas (campo é livre — o corretor pode digitar qualquer uma)
export const INSURERS: string[] = [
  // Multiline / Auto (as mais usadas)
  'Porto Seguro',
  'Azul Seguros',
  'Itaú Seguros',
  'Bradesco Seguros',
  'SulAmérica',
  'Allianz Seguros',
  'Mapfre',
  'HDI Seguros',
  'Tokio Marine',
  'Liberty Seguros',
  'Yelum Seguradora',
  'Zurich Seguros',
  'Sompo Seguros',
  'Suhai Seguradora',
  'Sura Seguros',
  'Chubb Seguros',
  'Essor Seguros',
  'Sancor Seguros',
  'Too Seguros',
  'Pier Seguradora',
  'Youse Seguros',
  'Kovr Seguradora',
  'Darwin Seguros',
  // Garantia / Fiança / Riscos
  'Pottencial Seguradora',
  'Junto Seguros',
  'Berkley Brasil',
  'Fairfax Brasil',
  'Excelsior Seguros',
  // Vida / Previdência
  'Icatu Seguros',
  'MetLife',
  'Prudential do Brasil',
  'MAG Seguros',
  'Mongeral Aegon',
  'Capemisa Seguradora',
  'Sabemi Seguradora',
  'BMG Seguros',
  'Pan Seguros',
  'Assurant',
  'Cardif',
  // Bancos / Grandes grupos
  'Caixa Seguradora',
  'Brasilseg (BB Seguros)',
  // Saúde
  'Amil',
  'Notre Dame Intermédica',
  'Hapvida',
  'Unimed',
  'Omint',
  'Bradesco Saúde',
  'SulAmérica Saúde',
  // Consórcio
  'Ademicon',
  'Porto Consórcio',
];

// Etapas do funil (kanban) — ordem importa
export const STAGES: { key: string; label: string; color: string }[] = [
  { key: 'NOVO', label: 'Novo', color: '#64748b' },
  { key: 'CONTATO', label: 'Em contato', color: '#2451eb' },
  { key: 'PROPOSTA', label: 'Proposta enviada', color: '#ca8a04' },
  { key: 'NEGOCIACAO', label: 'Negociação', color: '#ea580c' },
  { key: 'GANHO', label: 'Ganho', color: '#16a34a' },
];

export const STAGE_MAP: Record<string, { label: string; color: string }> = Object.fromEntries(
  STAGES.map((s) => [s.key, { label: s.label, color: s.color }]),
);

export const LEAD_STATUS: Record<string, { label: string; color: string }> = {
  NOVO: { label: 'Novo', color: 'slate' },
  EM_CONTATO: { label: 'Em contato', color: 'blue' },
  QUALIFICADO: { label: 'Qualificado', color: 'amber' },
  CONVERTIDO: { label: 'Convertido', color: 'emerald' },
  PERDIDO: { label: 'Perdido', color: 'red' },
};

export const LEAD_SOURCES: Record<string, string> = {
  SITE: 'Site',
  INDICACAO: 'Indicação',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  GOOGLE: 'Google',
  LIGACAO: 'Ligação',
  EVENTO: 'Evento',
  OUTRO: 'Outro',
};

export const LEAD_TEMP: Record<string, { label: string; color: string }> = {
  FRIO: { label: 'Frio', color: 'sky' },
  MORNO: { label: 'Morno', color: 'amber' },
  QUENTE: { label: 'Quente', color: 'red' },
};

export const POLICY_STATUS: Record<string, { label: string; color: string }> = {
  ATIVA: { label: 'Ativa', color: 'emerald' },
  A_VENCER: { label: 'A vencer', color: 'amber' },
  VENCIDA: { label: 'Vencida', color: 'red' },
  CANCELADA: { label: 'Cancelada', color: 'slate' },
  RENOVADA: { label: 'Renovada', color: 'blue' },
};

export const ACTIVITY_TYPES: Record<string, { label: string; icon: string }> = {
  LIGACAO: { label: 'Ligação', icon: 'phone' },
  WHATSAPP: { label: 'WhatsApp', icon: 'message-circle' },
  EMAIL: { label: 'E-mail', icon: 'mail' },
  REUNIAO: { label: 'Reunião', icon: 'users' },
  TAREFA: { label: 'Tarefa', icon: 'check-square' },
};
