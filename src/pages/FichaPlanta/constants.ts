/**
 * Datos de la demo de la ficha (UT RF3, con trazabilidad de orígenes — RNF6).
 *
 * El contenido seguirá viniendo de la API cuando exista una endpoint de ficha
 * (las clases del modelo de dominio `Planta`, `Ubicacion`,
 * `LugarHistoricoCultural`, `Observacion` todavía no existen), pero los textos
 * ya están recopilados y verificados con fuente declarada por si se reutilizan;
 * el detalle por especie está en `docs/contenido-especies-demo.md`.
 *
 * Fuentes de este fichero, consultadas el 25/10/2026:
 * - Descripciones y curiosidades: artículos de Wikipedia en español (CC BY-SA).
 * - Familias: Wikipedia / Wikidata (property P171).
 * - Fotos: Wikimedia Commons, con autor y licencia verificados individualmente
 *   (URL de miniatura de 500 px, que es un tamaño estándar del CDN de Wikimedia).
 * - Nombre común del inventario, distrito y barrio: Inventario de Arbolado del
 *   Ajuntament de València (ArcGIS REST, MapServer 151, CC BY 4.0); el recuento
 *   de ejemplares de cada especie también procede de esa fuente.
 */
export const DEMO_SPECIES = [
  {
    commonName: 'Jacaranda',
    scientificName: 'Jacaranda mimosifolia',
    family: 'Bignoniaceae',
    // Foto: https://commons.wikimedia.org/wiki/File:Jacaranda1212.jpg (Kahuroa, dominio público)
    photoUrl:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Jacaranda1212.jpg/500px-Jacaranda1212.jpg',
    photoAlt: 'Jacaranda en floración violeta',
    photoCredit: 'Kahuroa · Wikimedia Commons · dominio público',
    description:
      'Árbol subtropical oriundo de Sudamérica que alcanza los 12–15 metros y se cultiva por sus vistosas flores violetas, que cubren la copa en primavera antes de que salgan las hojas.',
    flowering: 'primavera',
    curiosity: {
      label: 'Dato curioso',
      text:
        'su fruto es una cápsula leñosa en forma de castañuela; en guaraní se llama ka-í jepopeté, algo así como «aplauso de mono».',
    },
    locations: [
      {
        // Ejemplo real del inventario de arbolado municipal (idarbol 5253 ejemplares de la especie).
        name: 'Vara de Quart',
        district: 'Patraix',
      },
    ],
    sources: [
      {
        name: 'Wikipedia (es)',
        description: 'Descripción y datos botánicos (CC BY-SA) · Consulta 25/10/2026',
        url: 'https://es.wikipedia.org/wiki/Jacaranda_mimosifolia',
        icon: 'search',
      },
      {
        name: 'Wikimedia Commons',
        description: 'Fotografía: "Jacaranda1212.jpg" de Kahuroa · dominio público · Consulta 25/10/2026',
        url: 'https://commons.wikimedia.org/wiki/File:Jacaranda1212.jpg',
        icon: 'search',
      },
      {
        name: 'Ajuntament de València',
        description: 'Inventario de arbolado municipal · 5.253 ejemplares · Consulta 25/10/2026',
        url: 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/151/query',
        icon: 'landmark',
      },
    ],
  },
  {
    commonName: 'Naranjo amargo',
    scientificName: 'Citrus × aurantium',
    family: 'Rutaceae',
    // Foto: https://commons.wikimedia.org/wiki/File:Bitter_orange_-_Citrus_×_aurantium_03.jpg (Zeynel Cebeci, CC BY-SA 4.0)
    photoUrl:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Bitter_orange_-_Citrus_%C3%97_aurantium_03.jpg/500px-Bitter_orange_-_Citrus_%C3%97_aurantium_03.jpg',
    photoAlt: 'Naranjas amargas en la copa del naranjo',
    photoCredit: 'Zeynel Cebeci · Wikimedia Commons · CC BY-SA 4.0',
    description:
      'Cítrico perennifolio de la familia de las rutáceas; es un híbrido originario del sudeste asiático que llegó a la Península con los árabes. De sus flores (azahar) se destila aceite esencial para perfumes, y su fruto amargo no se come en fresco.',
    flowering: '',
    curiosity: {
      label: 'Dato curioso',
      text:
        'es el portainjerto preferido de los cítricos comerciales, y su naranja amarga, con más pectina que la dulce, es la de la célebre mermelada de Sevilla que se envía a Inglaterra.',
    },
    locations: [
      {
        // Ejemplo real del inventario de arbolado municipal (12.661 ejemplares de la especie).
        name: 'Benicalap',
        district: 'Benicalap',
      },
    ],
    sources: [
      {
        name: 'Wikipedia (es)',
        description: 'Descripción y datos botánicos (CC BY-SA) · Consulta 25/10/2026',
        url: 'https://es.wikipedia.org/wiki/Citrus_%C3%97_aurantium',
        icon: 'search',
      },
      {
        name: 'Wikimedia Commons',
        description:
          'Fotografía: "Bitter orange - Citrus × aurantium 03.jpg" de Zeynel Cebeci · CC BY-SA 4.0 · Consulta 25/10/2026',
        url: 'https://commons.wikimedia.org/wiki/File:Bitter_orange_-_Citrus_%C3%97_aurantium_03.jpg',
        icon: 'search',
      },
      {
        name: 'Ajuntament de València',
        description: 'Inventario de arbolado municipal · 12.661 ejemplares · Consulta 25/10/2026',
        url: 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/151/query',
        icon: 'landmark',
      },
    ],
  },
  {
    commonName: 'Palmera datilera',
    scientificName: 'Phoenix dactylifera',
    family: 'Arecaceae',
    // Foto: https://commons.wikimedia.org/wiki/File:Phoenix_dactylifera_Daktylowiec_właściwy_2023-02-24_09.jpg (Agnieszka Kwiecień, Nova, CC BY-SA 4.0)
    photoUrl:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Phoenix_dactylifera_Daktylowiec_w%C5%82a%C5%9Bciwy_2023-02-24_09.jpg/500px-Phoenix_dactylifera_Daktylowiec_w%C5%82a%C5%9Bciwy_2023-02-24_09.jpg',
    photoAlt: 'Racimos de dátiles colgando de una palmera',
    photoCredit: 'Agnieszka Kwiecień, Nova · Wikimedia Commons · CC BY-SA 4.0',
    description:
      'Palmera cuyo fruto comestible es el dátil, probablemente originaria del suroeste de Asia; se usa como ornamental en zonas costeras cálidas, aislada o en grupos formando palmerales.',
    flowering: '',
    curiosity: {
      label: 'Dato curioso',
      text:
        'sus hojas, llamadas palmas, son las del Domingo de Ramos en España, y en Elche llegó a existir la mayor producción de dátil in vitro del mundo.',
    },
    locations: [
      {
        // Ejemplo real del inventario de arbolado municipal (7.565 ejemplares de la especie).
        name: 'Russafa',
        district: "L'Eixample",
      },
    ],
    sources: [
      {
        name: 'Wikipedia (es)',
        description: 'Descripción y datos botánicos (CC BY-SA) · Consulta 25/10/2026',
        url: 'https://es.wikipedia.org/wiki/Phoenix_dactylifera',
        icon: 'search',
      },
      {
        name: 'Wikimedia Commons',
        description:
          'Fotografía: "Phoenix dactylifera Daktylowiec właściwy 2023-02-24 09.jpg" de Agnieszka Kwiecień, Nova · CC BY-SA 4.0 · Consulta 25/10/2026',
        url: 'https://commons.wikimedia.org/wiki/File:Phoenix_dactylifera_Daktylowiec_w%C5%82a%C5%9Bciwy_2023-02-24_09.jpg',
        icon: 'search',
      },
      {
        name: 'Ajuntament de València',
        description: 'Inventario de arbolado municipal · 7.565 ejemplares · Consulta 25/10/2026',
        url: 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/151/query',
        icon: 'landmark',
      },
    ],
  },
  {
    commonName: 'Laurel de Indias',
    scientificName: 'Ficus microcarpa',
    family: 'Moraceae',
    // Foto: https://commons.wikimedia.org/wiki/File:Ficus_microcarpa_-_La_Gomera_02.jpg (H. Zell, CC BY-SA 3.0)
    photoUrl:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Ficus_microcarpa_-_La_Gomera_02.jpg/500px-Ficus_microcarpa_-_La_Gomera_02.jpg',
    photoAlt: 'Copa redondeada de un laurel de Indias en una rotonda',
    photoCredit: 'H. Zell · Wikimedia Commons · CC BY-SA 3.0',
    description:
      'Árbol perenne de gran porte y rápido crecimiento, con copa voluminosa y raíces aéreas que se unen al tronco; en España vive en las costas desde Cádiz hasta Valencia.',
    flowering: '',
    curiosity: {
      label: 'Dato curioso',
      text:
        'enraíza con tanta facilidad que los ejemplares jóvenes pueden llegar a crecer sobre muros, puentes y edificios de hormigón; en muchas regiones se le considera especie invasiva.',
    },
    locations: [
      {
        // Ejemplo real del inventario de arbolado municipal (3.157 ejemplares de la especie).
        name: 'Sant Francesc',
        district: 'Ciutat Vella',
      },
    ],
    sources: [
      {
        name: 'Wikipedia (es)',
        description: 'Descripción y datos botánicos (CC BY-SA) · Consulta 25/10/2026',
        url: 'https://es.wikipedia.org/wiki/Ficus_microcarpa',
        icon: 'search',
      },
      {
        name: 'Wikimedia Commons',
        description:
          'Fotografía: "Ficus microcarpa - La Gomera 02.jpg" de H. Zell · CC BY-SA 3.0 · Consulta 25/10/2026',
        url: 'https://commons.wikimedia.org/wiki/File:Ficus_microcarpa_-_La_Gomera_02.jpg',
        icon: 'search',
      },
      {
        name: 'Ajuntament de València',
        description: 'Inventario de arbolado municipal · 3.157 ejemplares · Consulta 25/10/2026',
        url: 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/151/query',
        icon: 'landmark',
      },
    ],
  },
  {
    commonName: 'Plátano de sombra',
    scientificName: 'Platanus × hispanica',
    family: 'Platanaceae',
    // Foto: https://commons.wikimedia.org/wiki/File:Platanus.JPG (Tiago Fioreze, CC BY-SA 3.0)
    photoUrl:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Platanus.JPG/500px-Platanus.JPG',
    photoAlt: 'Filera de plátanos de sombra en un parque',
    photoCredit: 'Tiago Fioreze · Wikimedia Commons · CC BY-SA 3.0',
    description:
      'Híbrido de imponente porte —hasta 55 metros— común en parques y jardines de las zonas templadas del mundo por la agradable sombra que proyecta.',
    flowering: '',
    curiosity: {
      label: 'Dato curioso',
      text:
        'antes del automóvil se plantaba en las cunetas de las carreteras para dar sombra a carros y diligencias durante los duros veranos mediterráneos, y puede llegar a vivir unos 500 años.',
    },
    locations: [
      {
        // Ejemplo real del inventario de arbolado municipal (9.947 ejemplares de la especie).
        name: 'Campanar',
        district: 'Campanar',
      },
    ],
    sources: [
      {
        name: 'Wikipedia (es)',
        description: 'Descripción y datos botánicos (CC BY-SA) · Consulta 25/10/2026',
        url: 'https://es.wikipedia.org/wiki/Platanus_%C3%97_hispanica',
        icon: 'search',
      },
      {
        name: 'Wikimedia Commons',
        description: 'Fotografía: "Platanus.JPG" de Tiago Fioreze · CC BY-SA 3.0 · Consulta 25/10/2026',
        url: 'https://commons.wikimedia.org/wiki/File:Platanus.JPG',
        icon: 'search',
      },
      {
        name: 'Ajuntament de València',
        description: 'Inventario de arbolado municipal · 9.947 ejemplares · Consulta 25/10/2026',
        url: 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/151/query',
        icon: 'landmark',
      },
    ],
  },
  {
    commonName: 'Tipuana',
    scientificName: 'Tipuana tipu',
    family: 'Fabaceae',
    // Foto: https://commons.wikimedia.org/wiki/File:Tipuana_tipu_kedumim_2.JPG (Daniel Ventura, CC BY-SA 3.0)
    photoUrl:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Tipuana_tipu_kedumim_2.JPG/500px-Tipuana_tipu_kedumim_2.JPG',
    photoAlt: 'Tipuana en floración amarilla junto a una vía',
    photoCredit: 'Daniel Ventura · Wikimedia Commons · CC BY-SA 3.0',
    description:
      'Árbol semicaducifolio de la familia de las leguminosas, originario de Argentina y Bolivia; resiste la sequía y es frecuente en avenidas y paseos por su floración amarilla y su buena sombra.',
    flowering: 'jul-ago',
    curiosity: {
      label: 'Dato curioso',
      text:
        'sus raíces son tan robustas y extensas que se desaconseja plantarlo junto a edificaciones; en Argentina las ninfas de un insecto hacen que las tipas «lloren» gotas azucaradas.',
    },
    locations: [
      {
        // Ejemplo real del inventario de arbolado municipal (2.955 ejemplares de la especie).
        name: 'La Vega Baixa',
        district: 'Algirós',
      },
    ],
    sources: [
      {
        name: 'Wikipedia (es)',
        description: 'Descripción y datos botánicos (CC BY-SA) · Consulta 25/10/2026',
        url: 'https://es.wikipedia.org/wiki/Tipuana_tipu',
        icon: 'search',
      },
      {
        name: 'Wikimedia Commons',
        description: 'Fotografía: "Tipuana tipu kedumim 2.JPG" de Daniel Ventura · CC BY-SA 3.0 · Consulta 25/10/2026',
        url: 'https://commons.wikimedia.org/wiki/File:Tipuana_tipu_kedumim_2.JPG',
        icon: 'search',
      },
      {
        name: 'Ajuntament de València',
        description: 'Inventario de arbolado municipal · 2.955 ejemplares · Consulta 25/10/2026',
        url: 'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/151/query',
        icon: 'landmark',
      },
    ],
  },
];

/**
 * Especie que pinta la ficha mientras no haya navegación entre especies:
 * se mantiene como Jacaranda, ahora con foto real.
 */
export const SAMPLE_SPECIES = DEMO_SPECIES[0];

/**
 * Aviso sobre el servicio de identificación de especies por imagen.
 *
 * El texto de la pantalla es provisional: depende del proveedor de
 * identificación que se conecte en el backend (Pl@ntNet es la candidata).
 */
export const IDENTIFICATION_NOTICE = {
  text: 'El servicio de identificación de especies por imagen se basa en una API de reconocimiento de Plantnet, actualizable regularmente y accesible en',
  url: 'https://my.plantnet.org',
};
