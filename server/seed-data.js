'use strict';
/**
 * Default multilingual content. Every entry is [tetum, portuguese, english, indonesian].
 * Source of truth for the first boot; afterwards the admin dashboard edits the database.
 * Tetum text follows the company profile (Profail Gabrinell 96 Unipessoal, Lda).
 */
const LANGS = ['tl', 'pt', 'en', 'id'];

const toObj = (arr) => ({ tl: arr[0], pt: arr[1], en: arr[2], id: arr[3] });

// "*word*" is rendered as a highlighted (gradient) word on the landing page.
const CONTENT = {
  // ---------- meta ----------
  'meta.title': ['Gabrinell 96 Unipessoal, Lda | Solusaun IT iha Timor-Leste', 'Gabrinell 96 Unipessoal, Lda | Soluções de TI em Timor-Leste', 'Gabrinell 96 Unipessoal, Lda | IT Solutions in Timor-Leste', 'Gabrinell 96 Unipessoal, Lda | Solusi TI di Timor-Leste'],
  'meta.description': [
    "Kompania IT nasional ne'ebé fornese software, DBMS, website, rede, CCTV, cyber security no apoiu tekniku iha Timor-Leste.",
    'Empresa nacional de TI que fornece software, DBMS, websites, redes, CCTV, cibersegurança e suporte técnico em Timor-Leste.',
    'National IT company delivering software, DBMS, websites, networking, CCTV, cyber security and technical support in Timor-Leste.',
    'Perusahaan TI nasional penyedia perangkat lunak, DBMS, website, jaringan, CCTV, keamanan siber dan dukungan teknis di Timor-Leste.',
  ],

  // ---------- navigation ----------
  'nav.home': ['Uma', 'Início', 'Home', 'Beranda'],
  'nav.about': ['Kona-ba Ami', 'Sobre Nós', 'About', 'Tentang Kami'],
  'nav.services': ['Servisu', 'Serviços', 'Services', 'Layanan'],
  'nav.vision': ['Visaun & Misaun', 'Visão & Missão', 'Vision & Mission', 'Visi & Misi'],
  'nav.values': ['Valor', 'Valores', 'Values', 'Nilai'],
  'nav.structure': ['Estrutura', 'Estrutura', 'Structure', 'Struktur'],
  'nav.contact': ['Kontaktu', 'Contacto', 'Contact', 'Kontak'],
  'nav.cta': ['Husu Konsultasaun', 'Pedir Consulta', 'Get a Consultation', 'Minta Konsultasi'],

  // ---------- hero ----------
  'hero.eyebrow': ['IT General Supplier', 'IT General Supplier', 'IT General Supplier', 'IT General Supplier'],
  'hero.title': [
    'Parseiru *Solusaun Digital* ba Ita-nia Negósiu',
    'O seu parceiro de *Soluções Digitais* em Timor-Leste',
    'Your partner for *Digital Solutions* in Timor-Leste',
    'Mitra *Solusi Digital* untuk Bisnis Anda',
  ],
  'hero.subtitle': [
    "Hetan solusaun ba ita-nia negósiu: DBMS, supplier hardware no software, web design, rede informátika no konfigurasaun CCTV — ho padraun profisionál no fiável.",
    'Encontre a solução para o seu negócio: DBMS, fornecimento de hardware e software, web design, redes informáticas e configuração de CCTV — com padrões profissionais e fiáveis.',
    'Get the solution for your business: DBMS, hardware & software supply, web design, networking and CCTV configuration — delivered with professional, reliable standards.',
    'Dapatkan solusi untuk bisnis Anda: DBMS, pemasok perangkat keras & lunak, desain web, jaringan komputer dan konfigurasi CCTV — dengan standar profesional dan andal.',
  ],
  'hero.cta1': ['Haree Ami-nia Servisu', 'Ver Serviços', 'Explore Services', 'Lihat Layanan'],
  'hero.cta2': ['Kontaktu Ami', 'Contacte-nos', 'Contact Us', 'Hubungi Kami'],
  'hero.slogan': ['Innovating Technology, Empowering the Future', 'Innovating Technology, Empowering the Future', 'Innovating Technology, Empowering the Future', 'Innovating Technology, Empowering the Future'],
  'hero.scroll': ['Skroll', 'Deslize', 'Scroll', 'Gulir'],
  'hero.chip.software': ['Software', 'Software', 'Software', 'Perangkat Lunak'],
  'hero.chip.dbms': ['DBMS', 'DBMS', 'DBMS', 'DBMS'],
  'hero.chip.network': ['Rede', 'Redes', 'Networking', 'Jaringan'],
  'hero.chip.cctv': ['CCTV', 'CCTV', 'CCTV', 'CCTV'],
  'hero.chip.security': ['Cyber Security', 'Cibersegurança', 'Cyber Security', 'Keamanan Siber'],
  'hero.chip.cloud': ['Cloud', 'Cloud', 'Cloud', 'Cloud'],

  // ---------- about ----------
  'about.eyebrow': ['Kona-ba Ami', 'Sobre Nós', 'About Us', 'Tentang Kami'],
  'about.title': [
    'Kompania IT nasional ne\'ebé *komprometidu* ba inovasaun',
    'Uma empresa nacional de TI *comprometida* com a inovação',
    'A national IT company *committed* to innovation',
    'Perusahaan TI nasional yang *berkomitmen* pada inovasi',
  ],
  'about.p1': [
    "Gabrinell 96 Unipessoal, Lda mak kompania nasional ida ne'ebé espesializa iha área Teknolojia Informasaun (IT), ne'ebé komprometidu atu fornese solusaun digital inovativu, efisiente no fiável ba instituisaun governu, organizasaun naun-governamental (ONG), empresa privadu no komunidade iha Timor-Leste.",
    'A Gabrinell 96 Unipessoal, Lda é uma empresa nacional especializada na área das Tecnologias de Informação (TI), comprometida em fornecer soluções digitais inovadoras, eficientes e fiáveis a instituições governamentais, organizações não-governamentais (ONG), empresas privadas e comunidades em Timor-Leste.',
    'Gabrinell 96 Unipessoal, Lda is a national company specialised in Information Technology (IT), committed to delivering innovative, efficient and reliable digital solutions to government institutions, non-governmental organisations (NGOs), private companies and communities in Timor-Leste.',
    'Gabrinell 96 Unipessoal, Lda adalah perusahaan nasional yang berspesialisasi di bidang Teknologi Informasi (TI), berkomitmen menghadirkan solusi digital yang inovatif, efisien, dan andal bagi lembaga pemerintah, organisasi non-pemerintah (LSM), perusahaan swasta, dan masyarakat di Timor-Leste.',
  ],
  'about.p2': [
    "Kompania ne'e fó servisu profisionál iha área dezenvolvimentu software, Database Management System (DBMS), website no aplikasaun móvel, instalasaun no manutensaun rede informátika, seguransa siber, cloud computing, IT consultancy no apoiu tekniku.",
    'A empresa presta serviços profissionais nas áreas de desenvolvimento de software, Database Management System (DBMS), websites e aplicações móveis, instalação e manutenção de redes informáticas, cibersegurança, cloud computing, consultoria de TI e apoio técnico.',
    'The company provides professional services in software development, Database Management Systems (DBMS), websites and mobile apps, network installation and maintenance, cyber security, cloud computing, IT consultancy and technical support.',
    'Perusahaan ini memberikan layanan profesional di bidang pengembangan perangkat lunak, Database Management System (DBMS), website dan aplikasi seluler, instalasi dan pemeliharaan jaringan komputer, keamanan siber, cloud computing, konsultasi TI, dan dukungan teknis.',
  ],
  'about.p3': [
    "Gabrinell 96 acredita katak teknolojia mak instrumentu importante atu aumenta produtividade, transparénsia no dezenvolvimentu sustentável. Ho ekipa profisionál no kompetente, ami buka atu sai parseiru estratéjiku ba organizasaun sira ne'ebé hakarak halo transformasaun digital.",
    'A Gabrinell 96 acredita que a tecnologia é um instrumento importante para aumentar a produtividade, a transparência e o desenvolvimento sustentável. Com uma equipa profissional e competente, procuramos ser o parceiro estratégico das organizações que querem fazer a sua transformação digital.',
    'Gabrinell 96 believes technology is a key instrument for increasing productivity, transparency and sustainable development. With a professional and competent team, we aim to be the strategic partner of organisations undertaking digital transformation.',
    'Gabrinell 96 percaya bahwa teknologi adalah instrumen penting untuk meningkatkan produktivitas, transparansi, dan pembangunan berkelanjutan. Dengan tim yang profesional dan kompeten, kami ingin menjadi mitra strategis bagi organisasi yang menjalani transformasi digital.',
  ],
  'about.sectors.title': ['Ami servisu ba', 'Trabalhamos para', 'We work with', 'Kami melayani'],
  'about.sector.gov': ['Instituisaun Governu', 'Instituições Governamentais', 'Government Institutions', 'Lembaga Pemerintah'],
  'about.sector.ngo': ['ONG', 'ONG', 'NGOs', 'LSM'],
  'about.sector.private': ['Empresa Privadu', 'Empresas Privadas', 'Private Companies', 'Perusahaan Swasta'],
  'about.sector.community': ['Komunidade', 'Comunidades', 'Communities', 'Masyarakat'],

  // ---------- services ----------
  'services.eyebrow': ['Ami-nia Servisu', 'Os Nossos Serviços', 'Our Services', 'Layanan Kami'],
  'services.title': [
    'Solusaun IT *kompletu* iha fatin ida de\'it',
    'Soluções de TI *completas* num só lugar',
    'Complete IT solutions in *one place*',
    'Solusi TI *lengkap* dalam satu tempat',
  ],
  'services.subtitle': [
    "Husi dezeñu sistema to'o apoiu loron-loron — ami kuida ita-nia nesesidade teknolójiku.",
    'Do desenho do sistema ao apoio diário — cuidamos das suas necessidades tecnológicas.',
    'From system design to day-to-day support — we take care of your technology needs.',
    'Dari desain sistem hingga dukungan harian — kami menangani kebutuhan teknologi Anda.',
  ],

  // ---------- vision & mission ----------
  'vision.eyebrow': ['Visaun & Misaun', 'Visão & Missão', 'Vision & Mission', 'Visi & Misi'],
  'vision.title': ['Visaun', 'Visão', 'Vision', 'Visi'],
  'vision.text': [
    '"Sai hanesan kompania lider iha área Teknolojia Informasaun iha Timor-Leste no rejiaun, ne\'ebé rekoñesidu ba inovasaun, kualidade servisu no kontribuisaun ba transformasaun digital sustentável."',
    '"Ser uma empresa líder na área das Tecnologias de Informação em Timor-Leste e na região, reconhecida pela inovação, qualidade de serviço e contribuição para uma transformação digital sustentável."',
    '"To be a leading Information Technology company in Timor-Leste and the region, recognised for innovation, service quality and its contribution to sustainable digital transformation."',
    '"Menjadi perusahaan terkemuka di bidang Teknologi Informasi di Timor-Leste dan kawasan, yang diakui atas inovasi, kualitas layanan, dan kontribusinya terhadap transformasi digital yang berkelanjutan."',
  ],
  'vision.note': [
    "Visaun ne'e reflete aspirasaun atu sai lider iha fornese solusaun IT integradu, apoia kliente sira atinji sira-nia objetivu negósiu ho teknolojia modernu.",
    'Esta visão reflete a aspiração de liderar o fornecimento de soluções de TI integradas, apoiando os clientes a atingir os seus objetivos de negócio com tecnologia moderna.',
    'This vision reflects our aspiration to lead in integrated IT solutions, helping clients reach their business goals with modern technology.',
    'Visi ini mencerminkan aspirasi kami untuk memimpin penyediaan solusi TI terpadu, membantu klien mencapai tujuan bisnis dengan teknologi modern.',
  ],
  'mission.title': ['Misaun', 'Missão', 'Mission', 'Misi'],

  // ---------- values ----------
  'values.eyebrow': ['Valor Principál', 'Valores Principais', 'Core Values', 'Nilai Utama'],
  'values.title': [
    'Prinsípiu ne\'ebé *orienta* ami-nia servisu',
    'Princípios que *orientam* o nosso trabalho',
    'Principles that *guide* our work',
    'Prinsip yang *memandu* pekerjaan kami',
  ],

  // ---------- organisation ----------
  'org.eyebrow': ['Estrutura Organizasionál', 'Estrutura Organizacional', 'Organizational Structure', 'Struktur Organisasi'],
  'org.title': [
    'Ekipa *estruturadu* no profisionál',
    'Uma equipa *estruturada* e profissional',
    'A *structured*, professional team',
    'Tim yang *terstruktur* dan profesional',
  ],
  'org.subtitle': [
    "Estrutura Gabrinell 96 Unipessoal, Lda — husi Diretór to'o ekipa operasionál.",
    'Estrutura da Gabrinell 96 Unipessoal, Lda — do Diretor às equipas operacionais.',
    'The structure of Gabrinell 96 Unipessoal, Lda — from the Director to the operational teams.',
    'Struktur Gabrinell 96 Unipessoal, Lda — dari Direktur hingga tim operasional.',
  ],
  'org.director': ['Diretór', 'Diretor', 'Director', 'Direktur'],
  'org.finance': ['Finansa', 'Finanças', 'Finance', 'Keuangan'],
  'org.operational': ['Operasionál', 'Operacional', 'Operational', 'Operasional'],
  'org.ict': ['ICT', 'TIC', 'ICT', 'TIK'],
  'org.marketing': ['Marketing', 'Marketing', 'Marketing', 'Pemasaran'],
  'org.accounting': ['Kontabilidade', 'Contabilidade', 'Accounting', 'Akuntansi'],
  'org.treasure': ['Tezouraria', 'Tesouraria', 'Treasury', 'Perbendaharaan'],
  'org.taxation': ['Impostu', 'Fiscalidade', 'Taxation', 'Perpajakan'],
  'org.stock': ['Stok', 'Stock', 'Stock', 'Stok'],
  'org.supervision': ['Supervizaun', 'Supervisão', 'Supervision', 'Supervisi'],
  'org.programming': ['Programasaun', 'Programação', 'Programming', 'Pemrograman'],
  'org.software': ['Software', 'Software', 'Software', 'Perangkat Lunak'],
  'org.hardware': ['Hardware', 'Hardware', 'Hardware', 'Perangkat Keras'],
  'org.advertising': ['Publisidade', 'Publicidade', 'Advertising', 'Periklanan'],
  'org.sales': ['Servisu Vendas', 'Serviço de Vendas', 'Sales Service', 'Layanan Penjualan'],
  'org.manager': ['Jerente', 'Gestor', 'Manager', 'Manajer'],
  'org.employee': ['Funsionáriu', 'Colaborador', 'Employee', 'Staf'],

  // ---------- contact ----------
  'contact.eyebrow': ['Kontaktu', 'Contacto', 'Contact', 'Kontak'],
  'contact.title': [
    'Mai ita *hasoru malu* no koalia ba ita-nia projetu',
    'Vamos *conversar* sobre o seu projeto',
    "Let's *talk* about your project",
    'Mari *berbincang* tentang proyek Anda',
  ],
  'contact.subtitle': [
    "Haruka mensajen ba ami no ekipa Gabrinell 96 sei responde lalais.",
    'Envie-nos uma mensagem e a equipa da Gabrinell 96 responderá em breve.',
    'Send us a message and the Gabrinell 96 team will get back to you shortly.',
    'Kirim pesan kepada kami dan tim Gabrinell 96 akan segera menanggapi.',
  ],
  'contact.address.label': ['Enderesu', 'Morada', 'Address', 'Alamat'],
  'contact.address.value': [
    'Beto Timur Ponte CPLP Rohan, Dom Aleixo, Dili, Timor-Leste',
    'Beto Timur Ponte CPLP Rohan, Dom Aleixo, Díli, Timor-Leste',
    'Beto Timur Ponte CPLP Rohan, Dom Aleixo, Dili, Timor-Leste',
    'Beto Timur Ponte CPLP Rohan, Dom Aleixo, Dili, Timor-Leste',
  ],
  'contact.phone.label': ['Telemóvel', 'Telemóvel', 'Phone', 'Telepon'],
  'contact.phone.value': ['+670 7612 7996 / +670 7413 0673', '+670 7612 7996 / +670 7413 0673', '+670 7612 7996 / +670 7413 0673', '+670 7612 7996 / +670 7413 0673'],
  'contact.email.label': ['Email', 'Email', 'Email', 'Email'],
  'contact.email.value': ['info.gabrinell@gmail.com', 'info.gabrinell@gmail.com', 'info.gabrinell@gmail.com', 'info.gabrinell@gmail.com'],
  'contact.form.name': ['Naran kompletu', 'Nome completo', 'Full name', 'Nama lengkap'],
  'contact.form.email': ['Email', 'Email', 'Email', 'Email'],
  'contact.form.phone': ['Nú. telemóvel (opsionál)', 'Telemóvel (opcional)', 'Phone (optional)', 'Telepon (opsional)'],
  'contact.form.subject': ['Asuntu', 'Assunto', 'Subject', 'Subjek'],
  'contact.form.message': ['Ita-nia mensajen', 'A sua mensagem', 'Your message', 'Pesan Anda'],
  'contact.form.send': ['Haruka Mensajen', 'Enviar Mensagem', 'Send Message', 'Kirim Pesan'],
  'contact.form.sending': ['Haruka...', 'A enviar...', 'Sending...', 'Mengirim...'],
  'contact.form.success': [
    'Obrigadu! Ita-nia mensajen haruka ona. Ami sei kontaktu ita lalais.',
    'Obrigado! A sua mensagem foi enviada. Entraremos em contacto brevemente.',
    'Thank you! Your message has been sent. We will contact you shortly.',
    'Terima kasih! Pesan Anda telah terkirim. Kami akan segera menghubungi Anda.',
  ],
  'contact.form.error': [
    'La konsege haruka mensajen. Favór koko fali.',
    'Não foi possível enviar a mensagem. Tente novamente.',
    'Could not send your message. Please try again.',
    'Pesan tidak dapat dikirim. Silakan coba lagi.',
  ],
  'contact.form.invalid': [
    'Favór prense naran, email válidu no mensajen.',
    'Preencha o nome, um email válido e a mensagem.',
    'Please enter your name, a valid email and a message.',
    'Harap isi nama, email yang valid, dan pesan.',
  ],
  'contact.form.toomany': [
    'Mensajen barak liu. Favór hein uitoan.',
    'Demasiadas mensagens. Aguarde um pouco.',
    'Too many messages. Please wait a moment.',
    'Terlalu banyak pesan. Mohon tunggu sebentar.',
  ],
  'contact.map': ['Haree iha mapa', 'Ver no mapa', 'View on map', 'Lihat di peta'],

  // ---------- footer ----------
  'footer.tagline': [
    'Get solution for your businesses — DBMS, Hardware & Software Supplier, Web Design, Networking, CCTV.',
    'Get solution for your businesses — DBMS, Hardware & Software Supplier, Web Design, Networking, CCTV.',
    'Get solution for your businesses — DBMS, Hardware & Software Supplier, Web Design, Networking, CCTV.',
    'Get solution for your businesses — DBMS, Hardware & Software Supplier, Web Design, Networking, CCTV.',
  ],
  'footer.rights': ['Direitu hotu-hotu rezervadu.', 'Todos os direitos reservados.', 'All rights reserved.', 'Hak cipta dilindungi.'],
  'footer.links': ['Liga importante', 'Ligações rápidas', 'Quick links', 'Tautan cepat'],
  'footer.top': ['Fila ba leten', 'Voltar ao topo', 'Back to top', 'Kembali ke atas'],
};

/** Services: [icon, [title...], [description...]] */
const SERVICES = [
  ['code', ['Dezenvolvimentu Software', 'Desenvolvimento de Software', 'Software Development', 'Pengembangan Perangkat Lunak'],
    ["Sistema informasaun no software tuir nesesidade ne'ebé responde ba prosesu negósiu kliente.", 'Sistemas de informação e software à medida, que respondem aos processos de negócio dos clientes.', 'Tailor-made information systems and software that fit your business processes.', 'Sistem informasi dan perangkat lunak sesuai kebutuhan yang selaras dengan proses bisnis klien.']],
  ['database', ['Database Management System (DBMS)', 'Database Management System (DBMS)', 'Database Management System (DBMS)', 'Database Management System (DBMS)'],
    ["Dezeñu, implementa no jere database ne'ebé seguru, lais no fasil atu tau matan.", 'Desenho, implementação e gestão de bases de dados seguras, rápidas e fáceis de manter.', 'Design, implementation and management of secure, fast and maintainable databases.', 'Perancangan, implementasi, dan pengelolaan basis data yang aman, cepat, dan mudah dirawat.']],
  ['globe', ['Website & Aplikasaun Móvel', 'Websites e Aplicações Móveis', 'Websites & Mobile Apps', 'Website & Aplikasi Seluler'],
    ["Web design modernu no aplikasaun móvel ne'ebé amigável ba uza-na'in no responsivu.", 'Web design moderno e aplicações móveis, amigáveis e responsivas.', 'Modern web design and mobile apps that are user-friendly and responsive.', 'Desain web modern dan aplikasi seluler yang ramah pengguna dan responsif.']],
  ['network', ['Rede Informátika', 'Redes Informáticas', 'Networking', 'Jaringan Komputer'],
    ['Instalasaun, konfigurasaun no manutensaun rede LAN/WAN no Wi-Fi ba eskritóriu no instituisaun.', 'Instalação, configuração e manutenção de redes LAN/WAN e Wi-Fi para escritórios e instituições.', 'Installation, configuration and maintenance of LAN/WAN and Wi-Fi networks for offices and institutions.', 'Instalasi, konfigurasi, dan pemeliharaan jaringan LAN/WAN dan Wi-Fi untuk kantor dan lembaga.']],
  ['camera', ['Konfigurasaun CCTV', 'Configuração de CCTV', 'CCTV Configuration', 'Konfigurasi CCTV'],
    ["Sistema vijilánsia ho kámara CCTV: instalasaun, konfigurasaun no monitorizasaun ba ita-nia seguransa.", 'Sistemas de videovigilância CCTV: instalação, configuração e monitorização para a sua segurança.', 'CCTV surveillance systems: installation, configuration and monitoring for your security.', 'Sistem pengawasan CCTV: instalasi, konfigurasi, dan pemantauan demi keamanan Anda.']],
  ['box', ['Supplier Hardware & Software', 'Fornecedor de Hardware e Software', 'Hardware & Software Supplier', 'Pemasok Perangkat Keras & Lunak'],
    ['Fornese komputador, ekipamentu IT no lisensa software ho kualidade ne\'ebé fiável.', 'Fornecimento de computadores, equipamento de TI e licenças de software de qualidade comprovada.', 'Supply of computers, IT equipment and software licences of proven quality.', 'Penyediaan komputer, perangkat TI, dan lisensi perangkat lunak berkualitas.']],
  ['shield', ['Seguransa Siber (Cyber Security)', 'Cibersegurança (Cyber Security)', 'Cyber Security', 'Keamanan Siber (Cyber Security)'],
    ['Proteje dadus no sistema husi ameasa digital ho avaliasaun, monitorizasaun no polítika seguransa.', 'Proteção de dados e sistemas contra ameaças digitais com avaliação, monitorização e políticas de segurança.', 'Protect data and systems from digital threats through assessment, monitoring and security policies.', 'Lindungi data dan sistem dari ancaman digital melalui penilaian, pemantauan, dan kebijakan keamanan.']],
  ['cloud', ['Cloud Computing', 'Cloud Computing', 'Cloud Computing', 'Cloud Computing'],
    ["Hosting, backup no migrasaun ba cloud atu halo ita-nia operasaun fleksivel no seguru.", 'Alojamento, backup e migração para a cloud para tornar as suas operações flexíveis e seguras.', 'Hosting, backup and cloud migration to keep your operations flexible and secure.', 'Hosting, backup, dan migrasi ke cloud agar operasional Anda fleksibel dan aman.']],
  ['support', ['IT Consultancy & Apoiu Tekniku', 'Consultoria de TI e Apoio Técnico', 'IT Consultancy & Technical Support', 'Konsultasi TI & Dukungan Teknis'],
    ["Konsultoria estratéjika no apoiu tekniku ne'ebé prontu ajuda ita ba transformasaun digital.", 'Consultoria estratégica e apoio técnico prontos para ajudar na sua transformação digital.', 'Strategic consultancy and technical support ready to help with your digital transformation.', 'Konsultasi strategis dan dukungan teknis siap membantu transformasi digital Anda.']],
];

/** Mission statements (body only). */
const MISSIONS = [
  ['Fornese servisu no solusaun IT ho padraun kualidade as.', 'Fornecer serviços e soluções de TI com elevados padrões de qualidade.', 'Deliver IT services and solutions to high quality standards.', 'Menyediakan layanan dan solusi TI dengan standar kualitas tinggi.'],
  ["Dezenvolve software, sistema informasaun no database ne'ebé responde ba nesesidade kliente.", 'Desenvolver software, sistemas de informação e bases de dados que respondam às necessidades dos clientes.', 'Develop software, information systems and databases that answer client needs.', 'Mengembangkan perangkat lunak, sistem informasi, dan basis data yang menjawab kebutuhan klien.'],
  ['Harii no implementa infraestrutura IT ne\'ebé seguru, estável no efisiente.', 'Construir e implementar infraestruturas de TI seguras, estáveis e eficientes.', 'Build and implement secure, stable and efficient IT infrastructure.', 'Membangun dan menerapkan infrastruktur TI yang aman, stabil, dan efisien.'],
  ["Fó konsultoria no apoiu tekniku hodi ajuda organizasaun sira adapta ba era digital.", 'Prestar consultoria e apoio técnico para ajudar as organizações a adaptarem-se à era digital.', 'Provide consultancy and technical support to help organisations adapt to the digital era.', 'Memberikan konsultasi dan dukungan teknis untuk membantu organisasi beradaptasi di era digital.'],
  ['Promove inovasaun no dezenvolvimentu rekursu umanu iha área teknolojia.', 'Promover a inovação e o desenvolvimento de recursos humanos na área da tecnologia.', 'Promote innovation and human-resource development in technology.', 'Mendorong inovasi dan pengembangan sumber daya manusia di bidang teknologi.'],
  ['Kria valor sustentável ba kliente no sosiedade liu husi uza teknolojia informasaun.', 'Criar valor sustentável para clientes e sociedade através da tecnologia de informação.', 'Create sustainable value for clients and society through information technology.', 'Menciptakan nilai berkelanjutan bagi klien dan masyarakat melalui teknologi informasi.'],
];

/** Core values: [icon, [title], [description]] */
const VALUES = [
  ['heart', ['Integridade', 'Integridade', 'Integrity', 'Integritas'],
    ['Servisu ho onestidade no transparénsia.', 'Trabalhar com honestidade e transparência.', 'Work with honesty and transparency.', 'Bekerja dengan kejujuran dan transparansi.']],
  ['bulb', ['Inovasaun', 'Inovação', 'Innovation', 'Inovasi'],
    ["Kria solusaun foun ba desafiu teknolójiku.", 'Criar novas soluções para desafios tecnológicos.', 'Create new solutions to technological challenges.', 'Menciptakan solusi baru atas tantangan teknologi.']],
  ['briefcase', ['Profisionalizmu', 'Profissionalismo', 'Professionalism', 'Profesionalisme'],
    ['Fó servisu ho kualidade no responsabilidade.', 'Prestar serviços com qualidade e responsabilidade.', 'Deliver service with quality and accountability.', 'Memberikan layanan dengan kualitas dan tanggung jawab.']],
  ['award', ['Kualidade', 'Qualidade', 'Quality', 'Kualitas'],
    ['Garantia rezultadu ne\'ebé satisfaz kliente.', 'Garantir resultados que satisfazem os clientes.', 'Guarantee results that satisfy clients.', 'Menjamin hasil yang memuaskan klien.']],
  ['users', ['Kolaborasaun', 'Colaboração', 'Collaboration', 'Kolaborasi'],
    ['Servisu hamutuk ho kliente no parseiru sira.', 'Trabalhar em conjunto com clientes e parceiros.', 'Work hand in hand with clients and partners.', 'Bekerja bersama klien dan mitra.']],
  ['target', ['Kompromisu', 'Compromisso', 'Commitment', 'Komitmen'],
    ['Entrega projetu tuir tempu no objetivu.', 'Entregar projetos a tempo e de acordo com os objetivos.', 'Deliver projects on time and on target.', 'Menyelesaikan proyek tepat waktu dan sesuai sasaran.']],
];

const PERMISSIONS = [
  ['dashboard.view', 'View dashboard & statistics'],
  ['content.read', 'View website content'],
  ['content.update', 'Edit website content & translations'],
  ['items.manage', 'Manage services, missions & values'],
  ['messages.read', 'Read contact messages'],
  ['messages.manage', 'Update / delete contact messages'],
  ['users.read', 'View users'],
  ['users.manage', 'Create / edit / disable users'],
  ['roles.manage', 'Manage roles & permissions'],
  ['audit.read', 'View audit log'],
];

const ROLES = [
  { name: 'super_admin', label: 'Super Admin', description: 'Full access to everything. Cannot be edited.', system: 1, permissions: PERMISSIONS.map((p) => p[0]) },
  { name: 'admin', label: 'Administrator', description: 'Manages content, messages and users.', system: 0,
    permissions: ['dashboard.view', 'content.read', 'content.update', 'items.manage', 'messages.read', 'messages.manage', 'users.read', 'users.manage', 'audit.read'] },
  { name: 'editor', label: 'Content Editor', description: 'Edits website content and services.', system: 0,
    permissions: ['dashboard.view', 'content.read', 'content.update', 'items.manage'] },
  { name: 'support', label: 'Support', description: 'Handles messages from the contact form.', system: 0,
    permissions: ['dashboard.view', 'messages.read', 'messages.manage'] },
  { name: 'viewer', label: 'Viewer', description: 'Read-only access.', system: 0,
    permissions: ['dashboard.view', 'content.read', 'messages.read'] },
];

module.exports = { LANGS, toObj, CONTENT, SERVICES, MISSIONS, VALUES, PERMISSIONS, ROLES };
