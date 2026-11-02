import { COPYRIGHT_OWNER, SITE_HOST } from '../../appMetadata.ts';
import { LiturgicalSeason } from '../schema.ts';
import { BibleEditionId } from '../language.ts';
import { ApplicationView } from '../../features/shell/model.ts';
import { Weekday } from '../../features/rosary/schedule.ts';
import { privacyText, type Wording } from './english.ts';

const SPANISH_ORDINALS: readonly string[] = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto'];

const SET_ADJECTIVES: Readonly<Record<string, string>> = {
  joyful: 'Gozoso',
  luminous: 'Luminoso',
  sorrowful: 'Doloroso',
  glorious: 'Glorioso',
};

const SPANISH_ARTICLES: readonly string[] = ['El ', 'La ', 'Los ', 'Las '];

export const SPANISH_WORDING: Wording = {
  views: {
    [ApplicationView.Rosary]: 'Rosario',
    [ApplicationView.Gallery]: 'Galería',
    [ApplicationView.Library]: 'Biblioteca',
    [ApplicationView.References]: 'Referencias',
  },
  weekdays: {
    [Weekday.Sunday]: 'Domingo',
    [Weekday.Monday]: 'Lunes',
    [Weekday.Tuesday]: 'Martes',
    [Weekday.Wednesday]: 'Miércoles',
    [Weekday.Thursday]: 'Jueves',
    [Weekday.Friday]: 'Viernes',
    [Weekday.Saturday]: 'Sábado',
  },
  seasons: {
    [LiturgicalSeason.Advent]: 'Adviento',
    [LiturgicalSeason.Christmas]: 'Navidad',
    [LiturgicalSeason.Lent]: 'Cuaresma',
  },
  artworkAlt: (title, artist) => `${title}, de ${artist}`,
  home: {
    selectedForToday: 'Elegidos para hoy',
    begin: 'Comenzar',
    mysteryArtwork: 'Obra del misterio',
    mysterySets: 'Grupos de misterios',
    mysteries: 'Misterios',
    today: 'hoy',
    collection: 'Colección Lucerna',
    openGallery: 'Abrir la galería',
  },
  support: {
    link: 'Apoya Lucerna',
    body: 'Lucerna es gratis para todos y funciona sin conexión, sin anuncios ni rastreo. Tu apoyo ayuda a cubrir el mantenimiento, el alojamiento y nuevas funciones.',
    give: 'Apoyar',
    notNow: 'Ahora no',
    thanks: 'Gracias por apoyar a Lucerna.',
  },
  common: {
    back: 'Atrás',
    later: 'Más tarde',
    close: 'Cerrar',
    viewInGallery: 'Ver en la galería',
    previousWorks: 'Obras anteriores',
    moreWorks: 'Más obras',
    note: 'Nota',
    noteAbout: (keyword) => `Nota: ${keyword}`,
    redLetterAbout: 'Acerca de las palabras de Cristo en rojo',
  },
  errors: {
    tryAgain: 'Intentar de nuevo',
    title: 'Algo salió mal',
    message: 'Lucerna no pudo mostrar esta pantalla.',
    eyebrow: 'Error',
    details: 'Detalles del diagnóstico',
    emailDiagnostics: 'Enviar diagnóstico por correo',
    copyDiagnostics: 'Copiar diagnóstico',
    copied: 'Copiado',
    copyFailed: 'No se pudo copiar',
    lastReport: 'Último informe de error',
    clearReport: 'Borrar este informe',
    diagnostics: 'Diagnóstico',
    keepsLastError: 'Lucerna guarda el último error en este dispositivo.',
    nothingSent: 'No se envía nada si no lo envías tú.',
    noError: 'No se ha registrado ningún error.',
  },
  update: {
    ready: 'Actualización lista',
    cached: 'Una nueva versión de Lucerna está guardada y lista.',
    now: 'Actualizar ahora',
  },
  prayer: {
    mysteryHeading: (ordinal, setId) =>
      `${SPANISH_ORDINALS[ordinal - 1] ?? ''} Misterio ${SET_ADJECTIVES[setId] ?? ''}`,
    mysteryPhrase: (title) => {
      const article = SPANISH_ARTICLES.find((candidate) => title.startsWith(candidate));

      return article === undefined
        ? title
        : `${article.toLowerCase()}${title.slice(article.length)}`;
    },
    decadeInProgress: 'Decena en curso',
    openingPrayer: 'Oración inicial',
    closingPrayer: 'Oración final',
    fatimaTitle: 'Oh Jesús mío',
    fruitLabel: 'Fruto del misterio',
    meditation: 'Meditación',
    offering: 'Ofrecimiento',
    guidance: 'Guía',
    spokenFruit: (fruit) => `Fruto del misterio. ${fruit}.`,
    spokenGuidance: (text, source) => `Guía. ${text} ${source}.`,
    spokenOffering: (label, text) => `${label}. ${text}`,
    hailMary: 'Avemaría',
    ourFather: 'Padre nuestro',
    hailMaryCount: (repetition, total) => `Avemaría ${String(repetition)} de ${String(total)}`,
    hailMaryState: (repetition, complete) =>
      `Avemaría ${String(repetition)} ${complete ? 'rezada' : 'pendiente'}`,
    repetitionProgress: 'Avance de las Avemarías',
    bead: (kind, position) => `Cuenta de ${kind} ${String(position)}`,
    crucifix: 'Crucifijo',
    centerpiece: 'Medalla central',
    chainLeading: 'Cadena antes de la cuenta siguiente',
    chainTrailing: 'Cadena después de la cuenta anterior',
    rosaryProgress: 'Avance del Rosario',
    currentDecade: 'Decena actual',
    prayerText: 'Texto de la oración',
    devotionalArtwork: 'Obra devocional',
    exit: 'Salir',
    finish: 'Terminar',
    continue: 'Continuar',
    pauseGuided: 'Pausar la oración guiada',
    beginGuided: 'Iniciar la oración guiada',
  },
  gallery: {
    eyebrow: 'Arte para la contemplación',
    lede: 'Obras reunidas para la oración y la contemplación.',
    title: 'La Colección Lucerna',
    viewBy: 'Ver por',
    byMystery: 'Misterio',
    byArtist: 'Artista',
    byDate: 'Fecha',
    dateUnknown: 'Fecha desconocida',
    viewReference: 'Ver la referencia',
    artwork: 'Obra',
    backToCollection: 'Volver a la colección',
    next: 'Siguiente',
    previous: 'Anterior',
    neighborUnavailable: (direction) => `${direction}: obra no disponible`,
    neighbor: (direction, title) => `${direction}: ${title}`,
    viewFullSize: 'Ver a tamaño completo',
  },
  library: {
    eyebrow: 'Textos para la oración y el estudio',
    title: 'La Biblioteca',
    reader: 'Lector',
    translatedBy: (translator) => `Traducción de ${translator}.`,
    scripture: 'Sagrada Escritura',
    devotions: 'Devociones',
    bibleTitle: 'La Sagrada Biblia',
    bibleEditions: {
      [BibleEditionId.DouayRheims]: 'Versión Douay-Rheims',
      [BibleEditionId.ClementineVulgate]: 'Vulgata Clementina, en latín',
      [BibleEditionId.Scio]: 'Versión de Scío de San Miguel',
    },
    oldTestament: 'El Antiguo Testamento',
    newTestament: 'El Nuevo Testamento',
    chapters: 'Capítulos',
    chapter: (label) => `Capítulo ${label}`,
    chapterCount: (count) => (count === 1 ? '1 capítulo' : `${String(count)} capítulos`),
    neighboringBooks: 'Libro anterior y siguiente',
    previousBook: (name) => `Anterior: ${name}`,
    nextBook: (name) => `Siguiente: ${name}`,
  },
  references: {
    title: 'Referencias',
    eyebrow: 'Fuentes y procedencia',
    lede: 'Estos registros identifican los textos, las indicaciones, la Escritura y las obras de arte que usa Lucerna. Todos los registros están disponibles sin conexión.',
    count: (count) => (count === 1 ? '1 referencia' : `${String(count)} referencias`),
    rosaryText: 'Texto del Rosario',
    scripture: 'Sagrada Escritura',
    guidance: 'Guía del Rosario',
    apparatus: 'Aparato editorial',
    artwork: 'Obras de arte',
    rights: 'Derechos',
    rosaryTextDescription:
      'Fuentes de las oraciones, los nombres de los misterios, el calendario semanal, los frutos, la selección de pasajes y las reflexiones.',
    scriptureDescription: 'La edición de la Biblia usada para las lecturas.',
    guidanceDescription: 'Las instrucciones en que se basan las indicaciones durante la oración.',
    apparatusDescription:
      'Las palabras de Cristo en rojo y las ediciones consultadas para identificarlas.',
    artworkDescription:
      'El registro de la fuente y la nota de derechos de cada obra incluida en Lucerna.',
    rightsDescription:
      'Las políticas de acceso abierto que rigen los archivos de imagen incluidos.',
    prayers: 'Oraciones',
    schedule: 'Calendario semanal',
    seasonalSundays: 'Domingos de los tiempos litúrgicos',
    setNames: 'Grupos de misterios',
    mysteries: 'Misterios',
    mysteryNames: 'Nombres de los misterios',
    fruits: 'Frutos',
    passageSelections: 'Selección de pasajes',
    readings: 'Lecturas',
    reflections: 'Reflexiones',
    redLetter: 'Palabras de Cristo en rojo',
    sections: (sections) =>
      `${sections.length === 1 ? 'Sección' : 'Secciones'} ${sections.join(', ')}`,
    prayer: 'Oración',
    record: 'Registro',
    usedIn: 'Dónde lo usa Lucerna',
    citedLocation: 'Ubicación citada',
    reference: 'Referencia',
    viewInLibrary: 'Ver en la Biblioteca',
    author: 'Autor',
    purpose: 'Finalidad',
    translator: 'Traductor',
    publisher: 'Editorial',
    published: 'Publicación',
    openSource: 'Abrir la fuente original',
    openAlternate: 'Abrir el texto alternativo',
    openRenewal: 'Abrir la búsqueda de renovación',
    openRights: 'Abrir la política de derechos',
    openDating: 'Abrir la fuente de datación',
    externalLinks: 'Enlaces a las fuentes externas',
    date: 'Fecha',
    collection: 'Colección',
    accession: 'Número de inventario',
    photograph: 'Fotografía',
  },
  install: {
    eyebrow: 'Lleva Lucerna en tu dispositivo',
    lede: 'Lucerna funciona en el navegador. Añádela a tu dispositivo y se abrirá como cualquier otra aplicación.',
    title: 'Cómo añadir Lucerna a tu dispositivo',
    devices: 'Dispositivos',
    iphone: {
      heading: 'iPhone',
      steps: [
        { instruction: 'Abre Lucerna en Safari.' },
        {
          instruction: 'Toca el botón Más, abajo a la derecha.',
          alt: 'Safari en el iPhone con el botón Más marcado abajo a la derecha',
        },
        {
          instruction: 'Toca Compartir.',
          alt: 'El menú de Safari en el iPhone con Compartir marcado',
        },
        {
          instruction: 'Toca Más al final de la fila de acciones.',
          alt: 'El panel para compartir del iPhone con el botón Más marcado en la fila de acciones',
        },
        {
          instruction: 'Toca Añadir a pantalla de inicio.',
          alt: 'El panel ampliado para compartir del iPhone con Añadir a pantalla de inicio marcado',
        },
        {
          instruction: 'Deja activado Abrir como app web y toca Añadir.',
          alt: 'El panel Añadir a pantalla de inicio en el iPhone con el botón Añadir marcado',
        },
      ],
    },
    ipad: {
      heading: 'iPad',
      steps: [
        { instruction: 'Abre Lucerna en Safari.' },
        {
          instruction: 'Toca el botón Compartir, arriba a la derecha.',
          alt: 'Safari en el iPad con el botón Compartir marcado arriba a la derecha',
        },
        {
          instruction: 'Toca Más al final de la fila de acciones.',
          alt: 'El panel para compartir del iPad con el botón Más marcado en la fila de acciones',
        },
        {
          instruction: 'Toca Añadir a pantalla de inicio.',
          alt: 'El panel ampliado para compartir del iPad con Añadir a pantalla de inicio marcado',
        },
        {
          instruction: 'Deja activado Abrir como app web y toca Añadir.',
          alt: 'El panel Añadir a pantalla de inicio en el iPad con el botón Añadir marcado',
        },
      ],
    },
    mac: {
      heading: 'Mac',
      steps: [
        { instruction: 'Abre Lucerna en Safari.' },
        {
          instruction: 'Haz clic en el botón Compartir y luego en Añadir al Dock.',
          alt: 'El menú Compartir de Safari en un Mac con Añadir al Dock marcado',
        },
        {
          instruction: 'Escribe un nombre y haz clic en Añadir.',
          alt: 'El panel Añadir al Dock en un Mac con el botón Añadir marcado',
        },
      ],
      note: 'También puedes elegir Archivo y luego Añadir al Dock. Se necesita macOS Sonoma o posterior.',
    },
    android: {
      heading: 'Android',
      steps: [
        { instruction: 'Abre Lucerna en Chrome.' },
        {
          instruction: 'Toca el botón de menú, arriba a la derecha.',
          alt: 'Chrome en Android con el botón de menú marcado arriba a la derecha',
        },
        {
          instruction: 'Toca Añadir a pantalla de inicio.',
          alt: 'El menú de Chrome en Android con Añadir a pantalla de inicio marcado',
        },
        {
          instruction: 'Toca Instalar.',
          alt: 'El panel Añadir a pantalla de inicio en Android con Instalar marcado',
        },
        {
          instruction: 'Vuelve a tocar Instalar para confirmar.',
          alt: 'El panel Instalar aplicación en Android con el botón Instalar marcado',
        },
      ],
      note: 'Elige Instalar, no Crear acceso directo. Un acceso directo se abre en el navegador.',
    },
    desktop: {
      heading: 'Windows y Linux',
      steps: [
        { instruction: 'Abre Lucerna en el navegador.' },
        {
          instruction: 'Haz clic en el icono de instalar, a la derecha de la barra de direcciones.',
        },
        { instruction: 'Haz clic en Instalar.' },
      ],
      note: 'Chrome, Brave, Edge y Opera funcionan igual en un Mac.',
    },
    firefox: {
      heading: 'Firefox',
      steps: [
        { instruction: 'Abre Lucerna en Firefox en un teléfono o tableta Android.' },
        { instruction: 'Toca el botón de menú.' },
        { instruction: 'Toca Instalar.' },
      ],
      note: 'Firefox de escritorio no puede instalar aplicaciones web. Usa Chrome, Brave, Edge, Opera o Safari.',
    },
  },
  splash: {
    continue: 'Continuar',
    preparing: 'Preparando Lucerna',
  },
  about: {
    title: 'Acerca de',
    description: 'Una aplicación para rezar el Rosario y contemplar arte devocional sin conexión.',
    version: 'Versión',
    copyright: 'Derechos de autor',
    license: 'Licencia',
    support: 'Asistencia',
    allRightsReserved: 'Todos los derechos reservados.',
    licenseDetail:
      'No se concede ninguna licencia para copiar, modificar o redistribuir el código fuente ni el diseño original de la aplicación.',
    contentRights:
      'Los textos devocionales y las obras de arte incluidos conservan la información de fuente y de derechos registrada en sus créditos.',
    trademark: (name, owner) => `${name}™ es una marca de ${owner}.`,
    openReferences: 'Abrir las referencias',
  },
  external: {
    title: '¿Abrir un sitio web externo?',
    body: 'Esta página no forma parte de Lucerna y puede necesitar conexión a internet.',
    stay: 'Quedarme aquí',
    continue: 'Continuar',
  },
  settings: {
    whenOpens: 'Al abrirse',
    alsoWhileOpen: 'También mientras está abierta',
    onLoadNote: 'Lucerna busca una versión nueva una vez, al iniciarse.',
    whileOpenNote: 'Si Lucerna está instalada, también busca cada veinte minutos.',
    sansSerif: 'Sin serifa',
    general: 'General',
    custom: 'Personalizada',
    noTimeout: 'Sin límite de tiempo',
    dark: 'Oscuro',
    parchment: 'Pergamino',
    followSystem: 'Según el sistema',
    fullRosary: 'Rosario completo',
    resize: 'Cambiar el tamaño de los ajustes',
    close: 'Cerrar los ajustes',
    appTextSize: 'Tamaño del texto de la app',
    appliesAll: 'Se aplica a todo el texto de la app.',
    readingFont: 'Tipo de letra para la lectura',
    readingPage: 'Página de lectura',
    appliesBooks: 'Se aplica solo a las páginas de los libros.',
    redLetterNote:
      'Muestra en rojo las palabras de Cristo en la Biblia y en las lecturas de los misterios.',
    readingTextSize: 'Tamaño del texto de lectura',
    readingPreview: 'Vista previa de la lectura',
    openingTimeout: 'Tiempo de espera en la pantalla de inicio',
    waits: 'Espera a que elijas Continuar.',
    continuesOnOwn: 'Continúa sola después del tiempo elegido.',
    language: 'Idioma',
    bibleChoice: 'Biblia para las lecturas',
    bibleChoiceNote: 'Se usa en las lecturas de los misterios y en los versículos de inicio.',
    appAppearance: 'Apariencia de la app',
    followSystemNote:
      'La opción «Según el sistema» usa la apariencia clara u oscura de tu dispositivo.',
    speedPresets: 'Velocidades predefinidas',
    guidedPrayer: 'Oración guiada',
    readingSpeed: 'Velocidad de lectura',
    guidedNote:
      'La oración guiada avanza sola tras dar tiempo para leer cada texto; a mayor velocidad, menos tiempo.',
    rosaryDisplay: 'Vista del rosario',
    currentDecadeNote:
      'La opción «Decena actual» muestra las cuentas de la decena que estás rezando y un pequeño esquema de todo el rosario.',
    beadMaterial: 'Material de las cuentas',
    allowTime: 'Da tiempo para leer este texto antes de continuar.',
    scriptureReadings: 'Lecturas de la Escritura',
    scriptureReadingsNote: 'Muestra la lectura breve de cada misterio.',
    mysteryFruits: 'Frutos de los misterios',
    fruitsNote: 'Muestra el fruto espiritual de cada misterio.',
    includeFruits: 'Incluir los frutos en la oración guiada',
    guidanceNote: 'Muestra indicaciones para la meditación.',
    includeGuidance: 'Incluir la guía en la oración guiada',
    decadeOfferings: 'Ofrecimientos de las decenas',
    offeringsNote:
      'Muestra el ofrecimiento de san Luis María Grignion de Montfort en cada misterio.',
    includeOfferings: 'Incluir los ofrecimientos en la oración guiada',
    decorativeInitials: 'Iniciales decorativas',
    initialsNote: 'Agranda la primera letra cuando hay espacio.',
    fatimaNote: 'Incluye Oh Jesús mío después de cada decena.',
    fatimaLabel: 'Oración de Fátima',
    duringPrayer: 'Durante la oración',
    updates: 'Actualizaciones',
    externalLinks: 'Enlaces externos',
    askNote: 'Pregunta antes de abrir un sitio web fuera de Lucerna.',
    askLabel: 'Preguntar antes de abrir sitios web',
    sections: 'Secciones de los ajustes',
    seconds: (seconds) => `${seconds} segundos`,
    speeds: { unhurried: 'Pausada', steady: 'Constante', brisk: 'Ágil' },
    textScales: {
      small: 'Pequeño',
      standard: 'Estándar',
      comfortable: 'Cómodo',
      large: 'Grande',
      extraLarge: 'Muy grande',
      maximum: 'Máximo',
    },
    materials: { wood: 'Madera', pearl: 'Perla', obsidian: 'Obsidiana', rose: 'Rosa' },
    aiTranslations: 'Usar traducciones con IA',
    aiTranslationsNote:
      'Muestra frutos, indicaciones, ofrecimientos de las decenas y El secreto del Rosario traducidos con IA cuando no hay un texto en español. Cada uno lleva una marca.',
    aiTranslated: 'Traducción con IA',
    aiMark: 'IA',
  },
  privacy: privacyText({
    link: 'Política de privacidad',
    title: `Política de privacidad de ${SITE_HOST}`,
    websiteTypeLabel: 'Tipo de sitio web:',
    websiteType:
      'Sitio web católico y gratuito de oración para rezar el Rosario, leer las Escrituras y contemplar arte sacro, con o sin conexión',
    effectiveLabel: 'Fecha de entrada en vigor:',
    effectiveDate: '31 de octubre de 2026',
    owner: `${SITE_HOST} (el «Sitio») es propiedad de ${COPYRIGHT_OWNER}, quien también lo administra.`,
    contactLabel: 'Contacto:',
    translationNote:
      'Esta traducción se hizo con IA. Si hay alguna diferencia, rige la versión en inglés.',
    sections: [
      {
        heading: 'Propósito',
        blocks: [
          'El propósito de esta política de privacidad (esta «Política de privacidad») es informar a los usuarios de nuestro Sitio sobre lo siguiente:',
          {
            items: [
              'Los datos personales que recopilaremos;',
              'El uso de los datos recopilados;',
              'Quién tiene acceso a los datos recopilados;',
              'Los derechos de los usuarios del Sitio; y',
              'La política de cookies del Sitio.',
            ],
          },
          'Esta Política de privacidad se aplica además de los términos y condiciones de nuestro Sitio.',
        ],
      },
      {
        heading: 'Consentimiento',
        blocks: [
          'Al usar nuestro Sitio, los usuarios aceptan y dan su consentimiento a:',
          {
            items: [
              'Las condiciones establecidas en esta Política de privacidad; y',
              'La recopilación, el uso y la conservación de los datos indicados en esta Política de privacidad.',
            ],
          },
        ],
      },
      {
        heading: 'Cómo usamos los datos personales',
        blocks: [
          'Los datos recopilados en nuestro Sitio solo se usarán para los fines indicados en esta Política de privacidad o en las páginas correspondientes de nuestro Sitio. No usaremos tus datos más allá de lo que indicamos en esta Política de privacidad.',
        ],
      },
      {
        heading: 'Con quién compartimos los datos personales',
        blocks: [],
        subsections: [
          {
            heading: 'Empleados',
            blocks: [
              'Podemos revelar datos de los usuarios a cualquier miembro de nuestra organización que razonablemente necesite acceder a ellos para cumplir los fines establecidos en esta Política de privacidad.',
            ],
          },
          {
            heading: 'Terceros',
            blocks: [
              'Podemos compartir datos de los usuarios con los siguientes terceros:',
              { items: ['GitHub Pages; y', 'Stripe.'] },
              'Podemos compartir con terceros los siguientes datos de los usuarios:',
              {
                items: [
                  'La dirección IP y los datos del navegador; y',
                  'Los datos de la tarjeta de pago, la dirección de correo electrónico, el país de facturación y el código postal.',
                ],
              },
              'Podemos compartir datos de los usuarios con terceros para los siguientes fines:',
              {
                items: [
                  'Alojar y servir el sitio web; y',
                  'Procesar los pagos de apoyo opcionales y enviar los recibos.',
                ],
              },
              'Los terceros no podrán acceder a los datos de los usuarios más allá de lo razonablemente necesario para cumplir el fin indicado.',
            ],
          },
          {
            heading: 'Otras divulgaciones',
            blocks: [
              'No venderemos ni compartiremos tus datos con otros terceros, excepto en los siguientes casos:',
              {
                items: [
                  'Si la ley lo exige;',
                  'Si se requiere para cualquier procedimiento legal;',
                  'Para demostrar o proteger nuestros derechos legales; y',
                  'A compradores o posibles compradores de esta empresa, en caso de que queramos venderla.',
                ],
              },
              'Si sigues enlaces de nuestro Sitio a otro sitio, ten en cuenta que no somos responsables de sus políticas y prácticas de privacidad ni tenemos control sobre ellas.',
            ],
          },
        ],
      },
      {
        heading: 'Cuánto tiempo conservamos los datos personales',
        blocks: [
          'Los datos de los usuarios se conservarán hasta que se haya cumplido el fin para el que se recopilaron.',
          'Te avisaremos si tus datos se conservan durante más tiempo.',
        ],
      },
      {
        heading: 'Cómo protegemos tus datos personales',
        blocks: [
          'No se recopilan datos personales. El sitio se sirve solo mediante HTTPS.',
          'Aunque tomamos todas las precauciones razonables para que los datos de los usuarios estén seguros y los usuarios protegidos, siempre existe un riesgo de daño. Internet en su conjunto puede ser inseguro a veces y, por eso, no podemos garantizar la seguridad de los datos de los usuarios más allá de lo razonablemente posible.',
        ],
      },
      {
        heading: 'Menores',
        blocks: [
          'La edad mínima para usar nuestro sitio web es de 13 años. No recopilamos ni usamos a sabiendas datos personales de menores de 13 años. Si descubrimos que hemos recopilado datos personales de un menor de 13 años, los eliminaremos lo antes posible. Si un menor de 13 años nos ha proporcionado datos personales, su madre, padre o tutor puede ponerse en contacto con la persona responsable de privacidad.',
        ],
      },
      {
        heading: 'Cómo acceder a los datos recopilados, modificarlos, eliminarlos o impugnarlos',
        blocks: [
          'Si quieres saber si hemos recopilado tus datos personales, cómo los hemos usado, si los hemos revelado y a quién, o si quieres que se eliminen o modifiquen de cualquier forma, ponte en contacto con la persona responsable de privacidad:',
          { officer: true },
        ],
      },
      {
        heading: 'Política de cookies',
        blocks: [
          'Una cookie es un pequeño archivo que un sitio web guarda en el disco duro del usuario. Su propósito es recopilar datos sobre los hábitos de navegación del usuario. Puedes elegir que se te avise cada vez que se envíe una cookie. También puedes desactivar por completo las cookies en tu navegador, aunque esto puede empeorar tu experiencia de uso.',
          'No usamos cookies en nuestro Sitio.',
        ],
      },
      {
        heading: 'Modificaciones',
        blocks: [
          'Esta Política de privacidad puede modificarse de vez en cuando para seguir cumpliendo la ley y para reflejar cualquier cambio en nuestra forma de recopilar datos. Cuando la modifiquemos, actualizaremos la «Fecha de entrada en vigor» que aparece al principio de esta Política de privacidad. Te recomendamos revisar periódicamente nuestra Política de privacidad para estar al tanto de cualquier cambio. Si es necesario, podemos avisar por correo electrónico a los usuarios de los cambios en esta Política de privacidad.',
        ],
      },
      {
        heading: 'Información de contacto',
        blocks: [
          `Si tienes preguntas, inquietudes o quejas, puedes ponerte en contacto con la persona responsable de privacidad, ${COPYRIGHT_OWNER}, en:`,
          { officer: true },
        ],
      },
    ],
  }),
  navigation: {
    primary: 'Principal',
    settings: 'Ajustes',
    goToRosary: 'Ir al Rosario',
    rosaryPrayer: 'Rezo del Rosario',
    reading: 'Lectura',
  },
};
