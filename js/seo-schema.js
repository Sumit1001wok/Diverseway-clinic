(function () {
  if (document.querySelector('script[type="application/ld+json"][data-seo-managed]')) {
    return;
  }

  var SITE = "https://www.diversewayclinic.com";
  var page = (document.body && document.body.dataset.seoPage) || "home";

  var clinic = {
    "@type": "MedicalClinic",
    "@id": SITE + "/#clinic",
    name: "Diverse Way Clinic",
    alternateName: "Diverse Way Therapeutic Center",
    url: SITE + "/",
    image: SITE + "/assets/images/logo.png",
    logo: SITE + "/assets/images/logo.png",
    telephone: ["+977-9845366417", "+977-9841362404"],
    email: "official@diversewayclinic.com",
    description:
      "Speech therapy in Nepal — certified speech therapists in Kathmandu and Lalitpur. Also offering occupational therapy, behaviour therapy, voice therapy, and psychological counselling.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Shankhamul Town Planning",
      addressLocality: "Lalitpur",
      addressRegion: "Bagmati Province",
      addressCountry: "NP",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 27.6807767,
      longitude: 85.3288076,
    },
    areaServed: [
      { "@type": "Country", name: "Nepal" },
      { "@type": "City", name: "Kathmandu" },
      { "@type": "City", name: "Lalitpur" },
    ],
    medicalSpecialty: [
      "Speech-Language Pathology",
      "Occupational Therapy",
      "Psychology",
      "Behavioral Health",
    ],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "18:00",
    },
  };

  var speechTherapyService = {
    "@type": "Service",
    "@id": SITE + "/#speech-therapy",
    name: "Speech Therapy in Nepal",
    alternateName: "Speech and Language Therapy Kathmandu",
    description:
      "Professional speech therapy for children and adults in Kathmandu, Nepal — speech delays, articulation, stuttering, language disorders, and voice therapy.",
    provider: { "@id": SITE + "/#clinic" },
    areaServed: { "@type": "Country", name: "Nepal" },
    serviceType: "Speech Therapy",
    url: SITE + "/services.html#speech-therapy",
  };

  var website = {
    "@type": "WebSite",
    "@id": SITE + "/#website",
    url: SITE + "/",
    name: "Diverse Way Clinic — Speech Therapy in Nepal",
    description: "Speech therapy and allied health services in Kathmandu, Nepal.",
    publisher: { "@id": SITE + "/#clinic" },
    inLanguage: "en-NP",
    potentialAction: {
      "@type": "SearchAction",
      target: SITE + "/services.html?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  var faqPage = {
    "@type": "FAQPage",
    "@id": SITE + "/#faq",
    mainEntity: [
      {
        "@type": "Question",
        name: "Where can I find speech therapy in Nepal?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Diverse Way Clinic in Shankhamul, Lalitpur (Kathmandu Valley) offers certified speech therapy for children and adults across Nepal. Book by phone at 9845366417 or WhatsApp.",
        },
      },
      {
        "@type": "Question",
        name: "What does speech therapy help with?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Speech therapy helps with speech delays, unclear speech (articulation), stuttering, language disorders, voice problems, and communication difficulties after illness or injury.",
        },
      },
      {
        "@type": "Question",
        name: "How do I book speech therapy in Kathmandu?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Call 9845366417 or 9841362404, message on WhatsApp, or use the online booking form at diversewayclinic.com/booking.html.",
        },
      },
    ],
  };

  var pageGraphs = {
    home: [clinic, website, speechTherapyService, faqPage],
    services: [
      clinic,
      speechTherapyService,
      {
        "@type": "Service",
        name: "Occupational Therapy Nepal",
        provider: { "@id": SITE + "/#clinic" },
        areaServed: { "@type": "Country", name: "Nepal" },
        url: SITE + "/services.html",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: "Services", item: SITE + "/services.html" },
        ],
      },
    ],
    about: [
      clinic,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: "About", item: SITE + "/about.html" },
        ],
      },
    ],
    contact: [
      clinic,
      {
        "@type": "ContactPage",
        "@id": SITE + "/contact.html#webpage",
        url: SITE + "/contact.html",
        name: "Contact Diverse Way Clinic — Speech Therapy Nepal",
        isPartOf: { "@id": SITE + "/#website" },
        about: { "@id": SITE + "/#clinic" },
      },
    ],
    booking: [
      clinic,
      speechTherapyService,
      {
        "@type": "WebPage",
        name: "Book Speech Therapy Appointment — Nepal",
        url: SITE + "/booking.html",
        isPartOf: { "@id": SITE + "/#website" },
      },
    ],
    blog: [clinic, website],
  };

  var graph = pageGraphs[page] || pageGraphs.home;
  var script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-seo-managed", "true");
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  });
  document.head.appendChild(script);
})();
