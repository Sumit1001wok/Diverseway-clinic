"use strict";

// One-time seed data for the CMS tables (services, team_members, testimonials,
// blog_posts, site_settings), transcribed from the site's original hardcoded
// HTML so the first boot reproduces the pre-CMS site exactly. Only used by
// db.js when a table is empty.

const SERVICES = [
  {
    slug: "speech-therapy",
    name: "Speech Therapy",
    short_description: "Improving communication and confidence through tailored interventions.",
    description:
      "Support for clearer speech and stronger communication—built around practical goals at home, school, and work. We help clients gain confidence through structured, step-by-step therapy.",
    icon_path: "M20 3H4a2 2 0 0 0-2 2v14l4-3h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z",
    detail_icon_path:
      "M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2Zm4 5h8v2H8V9Zm0 4h6v2H8v-2Z",
    photo_url: "assets/images/ai/therapy-speech-flashcards.png",
    accent_class: "accent-speech",
    treat_list: ["Speech delays", "Articulation (sound production)", "Fluency (stammering/stuttering)", "Language disorders"],
    whatsapp_message: "Hi, I would like to book Speech Therapy",
    sort_order: 1,
  },
  {
    slug: "occupational-therapy",
    name: "Occupational Therapy",
    short_description: "Helping clients build practical skills for independent daily living.",
    description:
      "Building everyday independence through meaningful routines and skill development. Our sessions are engaging, structured, and focused on real-life outcomes across ages.",
    icon_path: "M12 2a9 9 0 0 0-9 9v11l4-3h5a9 9 0 1 0 0-18Z",
    detail_icon_path:
      "M12 2a7 7 0 0 0-7 7v5a4 4 0 0 0 4 4h1v2H8v2h8v-2h-2v-2h1a4 4 0 0 0 4-4V9a7 7 0 0 0-7-7Zm-5 7a5 5 0 0 1 10 0v5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9Z",
    photo_url: "assets/images/ai/therapy-occupational-blocks.png",
    accent_class: "accent-ot",
    treat_list: ["Fine motor skills", "Sensory integration challenges", "Daily living activities"],
    whatsapp_message: "Hi, I would like to book Occupational Therapy",
    sort_order: 2,
  },
  {
    slug: "behaviour-therapy",
    name: "Behaviour Therapy",
    short_description: "Evidence-based support for positive habits and emotional regulation.",
    description:
      "Structured, skill-building therapy that supports positive behaviour, stronger social interaction, and improved emotional regulation. Our approach is practical, measurable, and family-inclusive.",
    icon_path: "M12 1l3 6 6 .9-4.5 4.4 1 6.2L12 16l-5.5 2.5 1-6.2L3 7.9 9 7l3-6Z",
    detail_icon_path: "M12 1l3 6 6 .9-4.5 4.4 1 6.2L12 16l-5.5 2.5 1-6.2L3 7.9 9 7l3-6Z",
    photo_url: "assets/images/ai/therapy-behaviour-shapes.png",
    accent_class: "accent-behaviour",
    treat_list: ["ABA-based therapy programs", "Social skills development", "Emotional regulation support"],
    whatsapp_message: "Hi, I would like to book Behaviour Therapy",
    sort_order: 3,
  },
  {
    slug: "psychological-counselling",
    name: "Psychological Counselling",
    short_description: "Safe, compassionate guidance for mental and emotional wellbeing.",
    description:
      "A safe space to heal, reflect, and rebuild resilience. We offer supportive counselling with a warm, non-judgmental approach—focused on practical tools and long-term wellbeing.",
    icon_path: "M12 3a7 7 0 0 0-7 7c0 5.25 7 11 7 11s7-5.75 7-11a7 7 0 0 0-7-7Zm0 9a2 2 0 1 1 0-4a2 2 0 0 1 0 4Z",
    detail_icon_path: "M12 3a7 7 0 0 0-7 7c0 5.25 7 11 7 11s7-5.75 7-11a7 7 0 0 0-7-7Zm0 9a2 2 0 1 1 0-4a2 2 0 0 1 0 4Z",
    photo_url: "assets/images/ai/therapy-session-play.png",
    accent_class: "accent-counselling",
    treat_list: ["Anxiety", "Depression", "Trauma support", "Family counselling"],
    whatsapp_message: "Hi, I would like to book Psychological Counselling",
    sort_order: 4,
  },
  {
    slug: "voice-therapy",
    name: "Voice Therapy",
    short_description: "Structured programs to strengthen voice clarity and vocal health.",
    description:
      "Protect and strengthen your voice with targeted exercises and vocal hygiene guidance. Ideal for recovering voices and professional voice users who need clarity, endurance, and control.",
    icon_path: "M13 2v10h8A8 8 0 1 1 11 3.1V2h2Z",
    detail_icon_path:
      "M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm7-3a1 1 0 1 0-2 0a5 5 0 0 1-10 0a1 1 0 1 0-2 0a7 7 0 0 0 6 6.92V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.08A7 7 0 0 0 19 11Z",
    photo_url: "assets/images/ai/therapy-speech-flashcards.png",
    accent_class: "accent-voice",
    treat_list: ["Vocal cord disorders", "Professional voice users", "Post-surgical rehabilitation"],
    whatsapp_message: "Hi, I would like to book Voice Therapy",
    sort_order: 5,
  },
  {
    slug: "special-education-support",
    name: "Special Education Support",
    short_description: "Focused academic and cognitive support for diverse learning needs.",
    description:
      "Focused academic and cognitive support for learners with diverse needs. We collaborate with families and schools to build practical strategies, confidence, and steady progress.",
    icon_path: "M19 3H5a2 2 0 0 0-2 2v14l4-3h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z",
    detail_icon_path: "M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4Zm4 4h8v2H8V8Zm0 4h8v2H8v-2Zm0 4h6v2H8v-2Z",
    photo_url: "assets/images/ai/therapy-occupational-blocks.png",
    accent_class: "accent-special-ed",
    treat_list: ["Learning disabilities", "IEP support", "Cognitive development"],
    whatsapp_message: "Hi, I would like to book Special Education Support",
    sort_order: 6,
  },
  {
    slug: "consultation",
    name: "Consultation",
    short_description: "A quick 15-minute consultation to discuss your needs and next steps.",
    description:
      "A focused 15-minute session to talk through your concerns, answer your questions, and help you choose the right service and therapist to get started.",
    icon_path: "M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20Zm1 10.41V6h-2v7l5.25 3.15l1-1.64L13 12.41Z",
    detail_icon_path: "M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20Zm1 10.41V6h-2v7l5.25 3.15l1-1.64L13 12.41Z",
    photo_url: "assets/images/ai/reception.png",
    accent_class: "accent-speech",
    treat_list: ["Initial assessment discussion", "Service and therapist recommendations", "Questions about therapy options"],
    whatsapp_message: "Hi, I would like to book a Consultation",
    sort_order: 0,
  },
];

const TEAM_MEMBERS = [
  {
    name: "Kriti Karn",
    title: "Director & Speech-Language Pathologist",
    bio: "Speech and language therapy with a calm, structured approach focused on confidence and clarity.",
    bio_short: "Speech and language support tailored to clarity and confidence.",
    photo_url: "assets/images/team-kriti-karn.jpg",
    whatsapp_message: "Hi, I'd like to book with Kriti Karn",
    sort_order: 1,
  },
  {
    name: "Ananya Adhikari",
    title: "Speech Therapist",
    bio: "Tailored speech and language support to help clients reach their communication goals.",
    bio_short: "Structured, supportive care for speech and language goals.",
    photo_url: null,
    whatsapp_message: "Hi, I'd like to book with Ananya Adhikari",
    sort_order: 2,
  },
  {
    name: "Manoj Kumar Sah",
    title: "Occupational Therapist",
    bio: "Builds daily living skills, fine motor abilities, and sensory regulation through practical routines.",
    bio_short: "Daily living skills, motor development, and sensory strategies.",
    photo_url: null,
    whatsapp_message: "Hi, I'd like to book with Manoj Kumar Sah",
    sort_order: 3,
  },
  {
    name: "Shrijana Subedi",
    title: "Behaviour Therapist & Psychological Counsellor",
    bio: "Behaviour support, emotional regulation, and confidential counselling for wellbeing and resilience.",
    bio_short: "Behaviour support, emotional regulation, and confidential counselling.",
    photo_url: "assets/images/team-shrijana-subedi.jpg",
    whatsapp_message: "Hi, I'd like to book with Shrijana Subedi",
    sort_order: 4,
  },
  {
    name: "Sumit Karna",
    title: "Computer Engineer & CEO",
    bio: "Leads Diverse Way Clinic's operations and technology, focused on making quality therapy more accessible for families.",
    bio_short: "Leading operations and technology at Diverse Way Clinic.",
    photo_url: "assets/images/team-sumit-karna.jpg",
    whatsapp_message: "Hi, I'd like to connect with Sumit Karna",
    sort_order: 5,
  },
];

const TESTIMONIALS = [
  {
    attribution: "Parent of a speech therapy patient",
    quote:
      "The therapists were patient, kind, and incredibly professional. We saw visible improvement in just a few weeks.",
    avatar_url: "assets/images/ai/avatar-1.png",
    stars: 5,
    sort_order: 1,
  },
  {
    attribution: "Occupational therapy client",
    quote: "Every session felt tailored to my needs. The clinic environment is calm, warm, and very reassuring.",
    avatar_url: "assets/images/ai/avatar-2.png",
    stars: 5,
    sort_order: 2,
  },
  {
    attribution: "Psychological counselling client",
    quote:
      "From counselling to follow-ups, the care quality has been exceptional. I truly felt heard and supported.",
    avatar_url: "assets/images/ai/avatar-3.png",
    stars: 5,
    sort_order: 3,
  },
];

const BLOG_POSTS = [
  {
    slug: "understanding-speech-delays",
    title: "Understanding Speech Delays in Young Children",
    excerpt: "Early signs of speech delay and when to see a speech therapist in Kathmandu, Nepal.",
    category: "speech",
    category_label: "Speech Therapy",
    tag_class: "",
    hero_image_url: "assets/images/ai/therapy-speech-flashcards.png",
    hero_image_alt: "Speech therapy flashcards session for children at Diverse Way Clinic Kathmandu Nepal",
    read_time: "2 min read",
    published_at: "2026-05-12",
    updated_at: "2026-05-31",
    is_featured: 0,
    status: "published",
    meta_description:
      "Learn early signs of speech delay in children in Nepal. When to see a speech therapist in Kathmandu — milestones, causes & support at Diverse Way Clinic. Call 9845366417.",
    keywords:
      "speech therapy, speech therapy in nepal, speech therapy nepal, speech delay Nepal, speech therapy Kathmandu, child speech therapist Kathmandu, language delay Nepal, speech therapist Lalitpur, paediatric speech therapy Nepal, Diverse Way Clinic, बच्चाको बोलाइ",
    body_html: `<p>In Nepal, many children grow up hearing Nepali at home, English at school, and local dialects from grandparents — a rich but sometimes confusing mix for parents. Speech delay means a child develops sounds, words, or sentences more slowly than peers. Mixing Nepali and English does not cause delay, but slow progress in every language may need assessment. By 18 months, most toddlers use several words; by age two, many combine two words. Few words, limited babbling, or daily frustration when communicating are signs to act on before ECD or nursery admission in Kathmandu.</p>

          <h2>Why early help matters in Nepal</h2>
          <p>In crowded classrooms across the Valley, teachers cannot always give individual attention. Children who struggle to speak may be labelled shy or naughty rather than supported. Early speech therapy builds clarity and confidence before SEE preparation and social pressure increase. Extended family may compare cousins during Dashain gatherings — trust your instinct if your child is consistently behind at home, tole play, and school alike.</p>

          <h2>Support at Diverse Way Clinic</h2>
          <p>At <a href="/services.html">Diverse Way Clinic</a>, Kathmandu, therapists use play, flashcards, and Nepali–English vocabulary work suited to local families. We serve Lalitpur, Bhaktapur, and Bagmati Province. Call <a href="tel:+9779845366417">9845366417</a> or <a href="/booking.html">book online</a>.</p>`,
    whatsapp_cta_heading: "Speech therapy in Kathmandu",
    whatsapp_cta_text: "Diverse Way Clinic · Bagmati Province, Nepal · WhatsApp 9845366417",
    whatsapp_cta_message: "Hi, I would like to book speech therapy in Kathmandu",
    related_slugs: ["voice-therapy-kathmandu", "play-based-therapy"],
  },
  {
    slug: "play-based-therapy",
    title: "Why Play-Based Therapy Works for Children",
    excerpt: "Play-based behaviour therapy for communication, regulation & social skills in Nepal.",
    category: "behaviour",
    category_label: "Behaviour Therapy",
    tag_class: "blog-tag--behaviour",
    hero_image_url: "assets/images/ai/therapy-session-play.png",
    hero_image_alt: "Play-based behaviour therapy session for children at Diverse Way Clinic Kathmandu Nepal",
    read_time: "2 min read",
    published_at: "2026-05-20",
    updated_at: "2026-05-31",
    is_featured: 1,
    status: "published",
    meta_description:
      "How play-based behaviour therapy helps children in Nepal build communication and social skills. ABA & child therapy at Diverse Way Clinic, Kathmandu. WhatsApp 9845366417.",
    keywords:
      "behaviour therapy Kathmandu, play therapy Nepal, ABA therapy Nepal, child behaviour therapist Kathmandu, autism support Nepal, Diverse Way Clinic, behaviour therapy Lalitpur, paediatric therapy Nepal",
    body_html: `<p>In Nepali homes, children learn through play — with toys, kitchen pots, festival rituals, and siblings nearby. Play-based behaviour therapy uses that natural style to teach communication, patience, and social skills without a rigid classroom feel. This suits Kathmandu families where joint living, busy streets, and long school days can overwhelm sensitive children. Rather than punishment, therapists build skills step by step through activities the child already enjoys, respecting how Nepali parents nurture warmth and closeness.</p>

          <h2>Skills for school and home in Nepal</h2>
          <p>Sessions target waiting turns, following instructions, expressing needs in Nepali or English, and managing frustration during homework or crowded market trips. Many private and community schools in the Valley expect children to sit quietly in large groups — play-based therapy prepares them gradually. Parents learn strategies for mornings before school, Dashain and Tihar routine changes, and screen-time limits common in urban Nepal today.</p>

          <h2>Help at Diverse Way Clinic</h2>
          <p>At <a href="/services.html">Diverse Way Clinic</a>, behaviour therapists meet children at eye level and involve caregivers in every plan. Families from Kathmandu, Lalitpur, and Bhaktapur visit for assessment and ongoing support. We align goals with your child's school and daily Nepali home life. WhatsApp <a href="tel:+9779845366417">9845366417</a> to book.</p>`,
    whatsapp_cta_heading: "Behaviour therapy in Kathmandu",
    whatsapp_cta_text: "Diverse Way Clinic · Nepal · WhatsApp 9845366417",
    whatsapp_cta_message: "Hi, I want behaviour therapy for my child in Kathmandu",
    related_slugs: ["understanding-speech-delays", "child-development-milestones"],
  },
  {
    slug: "fine-motor-activities-home",
    title: "Fine Motor Skills: Simple Activities at Home",
    excerpt: "Home OT activities for hand strength and coordination — Kathmandu, Nepal.",
    category: "ot",
    category_label: "Occupational Therapy",
    tag_class: "blog-tag--ot",
    hero_image_url: "assets/images/ai/therapy-occupational-blocks.png",
    hero_image_alt: "Occupational therapy fine motor activities with blocks at Diverse Way Clinic Kathmandu Nepal",
    read_time: "2 min read",
    published_at: "2026-05-08",
    updated_at: "2026-05-31",
    is_featured: 0,
    status: "published",
    meta_description:
      "Simple fine motor activities for children at home in Nepal. Occupational therapy tips from Diverse Way Clinic, Kathmandu — hand strength, writing readiness & daily skills.",
    keywords:
      "occupational therapy Kathmandu, fine motor skills Nepal, OT for children Kathmandu, sensory therapy Nepal, child OT Lalitpur, handwriting help Nepal, Diverse Way Clinic, occupational therapist Nepal",
    body_html: `<p>Fine motor skills — hand and finger control for writing, buttoning a school shirt, or eating daal–bhat — matter deeply before a child enters ECD or Class 1 in Nepal. Many Kathmandu parents notice weak pencil grip, messy handwriting in copybooks, or avoidance of colouring and crafts. Small apartments and limited outdoor play can mean fewer chances to build hand strength compared with previous generations who played freely in gullies and courtyards across the Valley.</p>

          <h2>Simple activities using Nepali household items</h2>
          <p>Try pinching playdough, threading beads or dried macaroni, tearing old paper, stirring lentils, peeling bananas, or using spray bottles on balcony plants. Picking up rice grains with fingers, folding clothes, and opening dal containers build dexterity without expensive imported toys. Keep practice to five or ten minutes daily — consistency beats long sessions. Praise effort during homework, especially when schools assign heavy copybook work before SEE years.</p>

          <h2>Occupational therapy in Kathmandu</h2>
          <p>If problems continue, an OT can assess grip, coordination, and sensory needs. At <a href="/services.html">Diverse Way Clinic</a>, we support English-medium and Nepali-medium learners across the Valley, linking clinic work with kitchen, school bag, and playground tasks at home. Book via <a href="/booking.html">online booking</a> or <a href="tel:+9779845366417">9845366417</a>.</p>`,
    whatsapp_cta_heading: "Occupational therapy in Kathmandu",
    whatsapp_cta_text: "Fine motor, sensory & daily living skills · Diverse Way Clinic, Nepal",
    whatsapp_cta_message: "Hi, I need occupational therapy in Kathmandu",
    related_slugs: ["child-development-milestones", "understanding-speech-delays"],
  },
  {
    slug: "when-to-seek-counselling",
    title: "When to Seek Professional Counselling",
    excerpt: "When to seek psychological counselling in Kathmandu — anxiety, stress & family support.",
    category: "wellbeing",
    category_label: "Wellbeing",
    tag_class: "blog-tag--wellbeing",
    hero_image_url: "assets/images/ai/therapy-behaviour-shapes.png",
    hero_image_alt: "Psychological counselling and child support session at Diverse Way Clinic Kathmandu Nepal",
    read_time: "2 min read",
    published_at: "2026-04-28",
    updated_at: "2026-05-31",
    is_featured: 0,
    status: "published",
    meta_description:
      "Signs you or your child may need psychological counselling in Kathmandu, Nepal. Confidential support at Diverse Way Clinic — anxiety, stress, family therapy. Call 9845366417.",
    keywords:
      "psychological counselling Kathmandu, mental health Nepal, counsellor Kathmandu, anxiety therapy Nepal, depression help Kathmandu, family counselling Nepal, Diverse Way Clinic, therapist Lalitpur, mental health clinic Nepal",
    body_html: `<p>Mental health is still spoken about quietly in many Nepali families, yet stress touches everyone — students facing SEE and NEB board exams, adults managing work in Kathmandu's traffic and pollution, and parents balancing joint-family expectations. Counselling offers a private space to talk without judgement. Seeking help is a practical step toward stability, not a weakness. Young people across Nepal increasingly accept that emotional wellbeing supports success at school, office, and home.</p>

          <h2>When to reach out</h2>
          <p>Consider counselling for lasting sadness, anxiety, sleep loss, withdrawal, anger, or difficulty concentrating. Life events — bereavement, divorce, a family member working abroad, financial strain, or lingering disaster-related stress — affect many households in Bagmati and beyond. Children may refuse school, clash at home, or struggle after bullying on the way to tuition. SEE, NEB exams, and festival-season family expectations add further strain. Talking to a counsellor is increasingly accepted among youth and professionals in Kathmandu today.</p>

          <h2>Counselling at Diverse Way Clinic</h2>
          <p>At <a href="/services.html">Diverse Way Clinic</a>, Kathmandu, sessions are confidential and culturally respectful. No referral is required. We serve students, working adults, and families across the Valley and Nepal, including those returning from abroad. Call <a href="tel:+9779845366417">9845366417</a> or <a href="/contact.html">contact us online</a>.</p>`,
    whatsapp_cta_heading: "Counselling in Kathmandu, Nepal",
    whatsapp_cta_text: "Confidential sessions · Diverse Way Clinic · WhatsApp 9845366417",
    whatsapp_cta_message: "Hi, I would like to book counselling in Kathmandu",
    related_slugs: ["play-based-therapy", "voice-therapy-kathmandu"],
  },
  {
    slug: "voice-therapy-kathmandu",
    title: "Voice Therapy for Teachers & Professionals in Nepal",
    excerpt: "Vocal health and voice therapy for hoarseness and strain — Kathmandu clinic.",
    category: "voice",
    category_label: "Voice Therapy",
    tag_class: "",
    hero_image_url: "assets/images/ai/therapy-speech-flashcards.png",
    hero_image_alt: "Voice and speech therapy session at Diverse Way Clinic Kathmandu Nepal",
    read_time: "2 min read",
    published_at: "2026-05-25",
    updated_at: "2026-05-31",
    is_featured: 0,
    status: "published",
    meta_description:
      "Voice therapy for hoarseness, vocal strain & clarity in Kathmandu, Nepal. Support for teachers, singers & professionals at Diverse Way Clinic. Book: 9845366417.",
    keywords:
      "voice therapy Kathmandu, voice therapy Nepal, speech therapist voice, hoarseness treatment Nepal, vocal cord therapy Kathmandu, teacher voice care Nepal, Diverse Way Clinic, voice clinic Nepal",
    body_html: `<p>Teachers speaking over noisy classrooms, call-centre staff on long shifts, dohori singers, tour guides, and religious leaders — many Nepalis depend on their voice for income. Kathmandu's dust, dry winter air, traffic pollution, and dehydration during hot seasons strain the throat. Hoarseness, pain while speaking, or losing your voice by afternoon should not be ignored, especially if you teach in private schools or perform regularly for audiences across Nepal.</p>

          <h2>Voice problems common in Nepal</h2>
          <p>Shouting in open-window classrooms, speaking without rest, acid reflux from spicy meals, smoking, and untreated colds can damage vocal cords over time. Teachers in Lalitpur and Kathmandu often teach back-to-back periods with little recovery time between sections. Singers and MCs at weddings work long evenings in loud halls. Winter dryness and wedding season overuse make rest and hydration especially important across Nepal. If strain lasts more than two weeks, seek assessment before livelihood is affected.</p>

          <h2>Voice therapy in Kathmandu</h2>
          <p>At <a href="/services.html">Diverse Way Clinic</a>, therapy includes breathing work, vocal hygiene, warm-ups, and habits suited to Nepal's climate and work patterns. Teachers, singers, and office staff across the Valley benefit from structured recovery plans that fit busy Nepali schedules. Book via <a href="/booking.html">online booking</a> or call <a href="tel:+9779845366417">9845366417</a>.</p>`,
    whatsapp_cta_heading: "Voice therapy in Kathmandu",
    whatsapp_cta_text: "Vocal health for professionals · Diverse Way Clinic, Nepal",
    whatsapp_cta_message: "Hi, I need voice therapy in Kathmandu",
    related_slugs: ["understanding-speech-delays", "when-to-seek-counselling"],
  },
  {
    slug: "child-development-milestones",
    title: "Child Development Milestones: What Parents Should Know",
    excerpt: "Developmental milestones and early support for children in Nepal.",
    category: "child",
    category_label: "Child Development",
    tag_class: "blog-tag--parent",
    hero_image_url: "assets/images/ai/therapy-occupational-blocks.png",
    hero_image_alt: "Child development and learning activities at Diverse Way Clinic Kathmandu Nepal",
    read_time: "2 min read",
    published_at: "2026-05-18",
    updated_at: "2026-05-31",
    is_featured: 0,
    status: "published",
    meta_description:
      "Child development milestones for parents in Nepal. When to seek support for delays — special education & therapy at Diverse Way Clinic, Kathmandu. 9845366417.",
    keywords:
      "child development Nepal, developmental delay Kathmandu, special education Nepal, child therapist Kathmandu, paediatric therapy Nepal, learning support Kathmandu, Diverse Way Clinic, child development clinic Nepal",
    body_html: `<p>From first steps on a Kathmandu flat to first day at ECD or Montessori, parents watch every milestone closely. Development covers movement, speech, social play, and learning — and ranges widely in Nepal's mixed households where grandparents, parents, and siblings interact daily. Comparing a child with cousins during Dashain or Tihar is common; persistent gaps across home, tole, and school deserve a closer look before Class 1 admission.</p>

          <h2>What to watch in the Nepali context</h2>
          <p>Notice whether your child sits, walks, and uses hands confidently; responds to name in Nepali or English; plays with others at park or nursery; and follows routines like washing hands before meals. Urban children may start school early; rural families may follow different timelines — yet ongoing difficulty in multiple settings signals need for support. Share concerns with your health post, school, and a development specialist together.</p>

          <h2>Support at Diverse Way Clinic</h2>
          <p>Our Kathmandu team combines speech, OT, and behaviour approaches for holistic child development care. Families visit from across Bagmati Province for assessment, school-readiness planning, and parent guidance rooted in Nepali daily life. We understand how families balance tradition, modern schooling, and high hopes for every child. <a href="/booking.html">Book a consultation</a> or WhatsApp <a href="tel:+9779845366417">9845366417</a>.</p>`,
    whatsapp_cta_heading: "Child development support in Nepal",
    whatsapp_cta_text: "Holistic care · Diverse Way Clinic, Kathmandu",
    whatsapp_cta_message: "Hi, I want child development support in Kathmandu",
    related_slugs: ["fine-motor-activities-home", "play-based-therapy"],
  },
];

const SETTINGS = {
  clinic_hours: {
    weekday_label: "Mon–Sat",
    weekday_hours: "9:00 AM – 6:00 PM",
    weekend_label: "Sun",
    weekend_hours: "By Appointment",
  },
};

module.exports = { SERVICES, TEAM_MEMBERS, TESTIMONIALS, BLOG_POSTS, SETTINGS };
