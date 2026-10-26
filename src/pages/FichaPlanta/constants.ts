/**
 * Datos de la demo de la ficha (UT 918 - F06: preparar textos de especies
 * botánicas del MVP; cubre RF3, con trazabilidad de orígenes — RNF6).
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
import type { FichaEspecie } from './types';

export const DEMO_SPECIES: FichaEspecie[] = [
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
      'Árbol subtropical oriundo de Sudamérica —de forma nativa crece en Argentina, Brasil, Bolivia y Paraguay—, de la familia de las bignonias. El ejemplar adulto alcanza los 12–15 metros (hasta 20 en condiciones favorables) y proyecta una copa irregular, a veces en forma de sombrilla, de 10–12 metros de diámetro y sombra de intensidad media. Se cultiva por sus vistosas flores de color azul violeta, de 4–5 cm, agrupadas en panículas erectas de 20–30 cm, que llenan por completo la copa en primavera antes de que salgan las hojas; en algún ejemplar se repite después una segunda floración, más escasa, en pleno verano.',
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
      'Árbol cítrico perennifolio de la familia de las rutáceas, de 7–8 metros de altura y con espinas axilares agudas. Es un híbrido entre el pomelo (Citrus maxima) y la mandarina (Citrus reticulata) que surgió en el sudeste asiático y, vía India y Persia, se expandió con el mundo árabe desde el año 700, llegando a la península ibérica durante la expansión musulmana. Muchas variedades se usan por su aceite esencial para perfumes, saborizantes y como medicina; de sus flores sale el azahar, y su fruta amarga es la conocida naranja de Sevilla, naranja cajera o naranja cachorreña.',
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
      'Palmera cuyo fruto comestible es el dátil, probablemente oriunda del suroeste de Asia. Es una de las especies más notables del género Phoenix, que cuenta con unas quince especies repartidas desde Canarias, pasando por el norte de África y el sur de Asia, hasta el Extremo Oriente. Se usa comercialmente para el aprovechamiento de sus frutos y también como ornamental en zonas cálidas costeras, como elemento aislado, en hileras o en grupos formando palmerales; en España sus hojas, llamadas palmas, se utilizan en la celebración del Domingo de Ramos, y de sus vainas sale una fibra apreciada para cuerda y tela gruesa.',
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
      'Árbol perenne de gran porte y rápido crecimiento que llega a superar los 15 metros de altura, muy ramificado y con copa voluminosa. Emite raíces aéreas que, al tocar el suelo, enraízan, engrosan y terminan uniéndose al tronco. Nativo del sur y sureste de Asia, este ficus —llamado comúnmente laurel de Indias— se utiliza como árbol de sombra en las calles de muchas localidades de climas cálidos y subtropicales; en España se encuentra desde la costa de Cádiz hasta la de Valencia, además de en las Islas Baleares y Canarias, y también se cultiva como planta ornamental de interior y como bonsái.',
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
    photoAlt: 'Hilera de plátanos de sombra en un parque',
    photoCredit: 'Tiago Fioreze · Wikimedia Commons · CC BY-SA 3.0',
    description:
      'Árbol de imponente porte —alcanza hasta los 55 metros de alto—, perteneciente a la familia de las platanáceas y de muy larga vida: puede vivir hasta 500 años. Por lo general se considera un híbrido de Platanus orientalis y Platanus occidentalis, aunque hay expertos que opinan que puede tratarse de un cultivar de P. orientalis, y su origen exacto no está claro. Es común en los parques y jardines de todas las ciudades de las zonas templadas del mundo por la agradable sombra que proporciona; antes de la aparición del automóvil se usaba profusamente en las cunetas de las carreteras para dar sombra a carros, carruajes y diligencias durante los duros veranos mediterráneos. A la hora de plantarlo hay que tener en cuenta su problemática alergénica.',
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
      'Árbol semicaducifolio de la familia de las leguminosas (Fabaceae), la única especie aceptada del género Tipuana y originaria de Argentina y Bolivia. Resiste la sequía sin llegar a perder las hojas, y en las zonas urbanas es frecuente en calles anchas, avenidas, paseos y jardines por su magnífica floración amarilla y su muy buena sombra; en el hemisferio norte florece alrededor de julio y agosto. Sus raíces, robustas y extensas, hacen que no se aconseje plantarlo cerca de edificaciones, y su madera se ha empleado para fabricar muebles, puertas y escaleras.',
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
