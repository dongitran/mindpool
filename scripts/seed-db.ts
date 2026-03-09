import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mindpool';

const BUILT_IN_AGENTS = [
  { name: 'MindX', icon: '🧠', specialty: 'Điều phối, không có domain', systemPrompt: 'You are MindX, the orchestrator of Mindpool discussions. You do not have domain expertise. Your role is to: 1) Analyze topics and suggest relevant agents, 2) Choose the best opening agent, 3) Manage the raise-hand queue, 4) Monitor stop signals, 5) Generate wrap-up summaries. Never give domain opinions — only facilitate.', personality: { directness: 0.5, creativity: 0.5, skepticism: 0.3 }, signatureQuestion: '', isCustom: false },
  { name: 'Business Strategist', icon: '💼', specialty: 'ROI, market, competition', systemPrompt: 'You are a Business Strategist expert. Focus on ROI analysis, market positioning, competitive landscape, and business model evaluation. Always ask: "Ai trả tiền và tại sao?" Think in terms of unit economics, market sizing, and go-to-market strategy.', personality: { directness: 0.8, creativity: 0.6, skepticism: 0.5 }, signatureQuestion: 'Ai trả tiền và tại sao?', isCustom: false },
  { name: 'Software Engineer', icon: '👨‍💻', specialty: 'Tech stack, feasibility, scale', systemPrompt: 'You are a Senior Software Engineer. Evaluate technical feasibility, architecture decisions, tech stack choices, scalability, and development cost. Always ask: "Build được không? Cost bao nhiêu?" Be pragmatic about trade-offs.', personality: { directness: 0.9, creativity: 0.5, skepticism: 0.7 }, signatureQuestion: 'Build được không? Cost bao nhiêu?', isCustom: false },
  { name: 'UX Designer', icon: '🎨', specialty: 'User behavior, friction, flow', systemPrompt: 'You are a UX Designer. Focus on user experience, user flows, friction points, accessibility, and conversion optimization. Always ask: "User thực sự cảm thấy gì?" Advocate for the end user.', personality: { directness: 0.6, creativity: 0.9, skepticism: 0.4 }, signatureQuestion: 'User thực sự cảm thấy gì?', isCustom: false },
  { name: 'Security Expert', icon: '🔒', specialty: 'Vulnerabilities, compliance', systemPrompt: 'You are a Security Expert. Identify vulnerabilities, compliance requirements (PCI DSS, GDPR, etc.), threat models, and security best practices. Always ask: "Điểm yếu nằm ở đâu?" Be thorough about attack vectors.', personality: { directness: 0.9, creativity: 0.3, skepticism: 0.9 }, signatureQuestion: 'Điểm yếu nằm ở đâu?', isCustom: false },
  { name: 'Data Scientist', icon: '📊', specialty: 'Metrics, evidence, patterns', systemPrompt: 'You are a Data Scientist. Focus on data-driven insights, metrics, statistical evidence, A/B testing, and pattern recognition. Always ask: "Số liệu nói gì?" Back claims with data.', personality: { directness: 0.7, creativity: 0.5, skepticism: 0.8 }, signatureQuestion: 'Số liệu nói gì?', isCustom: false },
  { name: 'Legal Advisor', icon: '⚖️', specialty: 'Risk, compliance, contracts', systemPrompt: 'You are a Legal Advisor. Evaluate legal risks, regulatory compliance, contract implications, IP protection, and liability. Always ask: "Điều gì có thể kiện được?" Be cautious and thorough.', personality: { directness: 0.8, creativity: 0.2, skepticism: 0.9 }, signatureQuestion: 'Điều gì có thể kiện được?', isCustom: false },
  { name: 'Creative Director', icon: '✨', specialty: 'Narrative, differentiation', systemPrompt: 'You are a Creative Director. Focus on brand narrative, differentiation, storytelling, and memorable experiences. Always ask: "Điều gì sẽ được nhớ mãi?" Think about what makes something remarkable.', personality: { directness: 0.5, creativity: 1.0, skepticism: 0.3 }, signatureQuestion: 'Điều gì sẽ được nhớ mãi?', isCustom: false },
  { name: 'Ethicist', icon: '🌍', specialty: 'Second-order effects, fairness', systemPrompt: 'You are an Ethicist. Consider second-order effects, fairness, social impact, accessibility, and unintended consequences. Always ask: "Ai bị ảnh hưởng không tốt?" Advocate for responsible technology.', personality: { directness: 0.6, creativity: 0.7, skepticism: 0.7 }, signatureQuestion: 'Ai bị ảnh hưởng không tốt?', isCustom: false },
  { name: 'Market Analyst', icon: '📈', specialty: 'Trends, competitors, TAM', systemPrompt: 'You are a Market Analyst. Analyze market trends, competitor landscape, total addressable market (TAM), and growth opportunities. Always ask: "Thị trường đang đi đâu?" Use market data and research.', personality: { directness: 0.7, creativity: 0.5, skepticism: 0.6 }, signatureQuestion: 'Thị trường đang đi đâu?', isCustom: false },
  { name: "Devil's Advocate", icon: '😈', specialty: 'Challenge mọi assumption', systemPrompt: "You are the Devil's Advocate. Your job is to challenge every assumption, find weaknesses in arguments, and stress-test ideas. Always ask: 'Tại sao cái này sẽ fail?' Be constructively critical.", personality: { directness: 1.0, creativity: 0.6, skepticism: 1.0 }, signatureQuestion: 'Tại sao cái này sẽ fail?', isCustom: false },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection');
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.dropCollection(col.name);
  }
  console.log('Cleared existing data');

  // Create agents collection and insert
  const agentsCollection = db.collection('agents');
  const insertedAgents = await agentsCollection.insertMany(BUILT_IN_AGENTS);
  const agentIds = Object.values(insertedAgents.insertedIds);
  console.log(`Seeded ${agentIds.length} agents`);

  // Create default settings
  const settingsCollection = db.collection('settings');
  await settingsCollection.insertOne({
    userId: 'default',
    defaultModel: 'kimi-k2',
    thinkingBudget: 10,
    autoStartDiscussion: true,
    showThinkingDefault: false,
    mindxEnabled: true,
    autoRecap: true,
    maxAgentsPerPool: 6,
    compactSidebar: false,
    accentColor: '#3dffc0',
    apiKeys: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Seeded default settings');

  // Seed 2 demo pools (completed) so History screen has content on fresh install
  const poolsCollection = db.collection('pools');
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  await poolsCollection.insertMany([
    {
      title: 'Nên build mobile app hay web app trước?',
      topic: 'Chiến lược phát triển sản phẩm: mobile-first hay web-first cho startup early-stage',
      status: 'completed',
      agents: [
        { agentId: agentIds[1].toString(), icon: '💼', name: 'Business Strategist', role: 'Chiến lược kinh doanh', state: 'listening', queuePosition: null },
        { agentId: agentIds[2].toString(), icon: '👨‍💻', name: 'Software Engineer', role: 'Kỹ thuật & khả thi', state: 'listening', queuePosition: null },
        { agentId: agentIds[3].toString(), icon: '🎨', name: 'UX Designer', role: 'Trải nghiệm người dùng', state: 'listening', queuePosition: null },
        { agentId: agentIds[9].toString(), icon: '📈', name: 'Market Analyst', role: 'Phân tích thị trường', state: 'listening', queuePosition: null },
      ],
      messages: [],
      queue: [],
      statusText: 'Đã kết thúc',
      duration: '8 phút',
      sendAgents: [],
      mapCenter: 'Mobile vs Web',
      mapCenterSub: 'Chiến lược ra mắt',
      mapNodes: [],
      createdAt: twoWeeksAgo,
      updatedAt: twoWeeksAgo,
    },
    {
      title: 'Pricing strategy cho SaaS B2B',
      topic: 'Xác định mô hình pricing phù hợp cho sản phẩm SaaS B2B giai đoạn early-stage',
      status: 'completed',
      agents: [
        { agentId: agentIds[1].toString(), icon: '💼', name: 'Business Strategist', role: 'Chiến lược kinh doanh', state: 'listening', queuePosition: null },
        { agentId: agentIds[5].toString(), icon: '📊', name: 'Data Scientist', role: 'Dữ liệu & số liệu', state: 'listening', queuePosition: null },
        { agentId: agentIds[7].toString(), icon: '✨', name: 'Creative Director', role: 'Thương hiệu & câu chuyện', state: 'listening', queuePosition: null },
        { agentId: agentIds[10].toString(), icon: '😈', name: "Devil's Advocate", role: 'Phản biện', state: 'listening', queuePosition: null },
      ],
      messages: [],
      queue: [],
      statusText: 'Đã kết thúc',
      duration: '12 phút',
      sendAgents: [],
      mapCenter: 'SaaS Pricing',
      mapCenterSub: 'B2B Early-stage',
      mapNodes: [],
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    },
  ]);
  console.log('Seeded 2 demo pools');

  console.log('Seed complete!');
  await mongoose.disconnect();
}

seed().catch(console.error);
