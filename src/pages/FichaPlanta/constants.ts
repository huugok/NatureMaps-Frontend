/**
 * Datos de ejemplo de la ficha (mockup de la UT RF3).
 *
 * Son literales sueltos, sin tipos declarados a propósito: la ficha todavía no
 * tiene detrás las clases del modelo de dominio (`Planta`, `Ubicacion`,
 * `LugarHistoricoCultural`, `Observacion`) ni un endpoint de ficha en el
 * backend, y esta UT solo construye la parte visual. Cuando esas clases
 * existan, estos datos desaparecerán y llegarán de la API.
 */
export const SAMPLE_SPECIES = {
  commonName: 'Jacaranda',
  scientificName: 'Jacaranda mimosifolia',
  family: 'Bignoniaceae',
  // Vacío hasta que haya fotos reales: mientras tanto se muestra el marcador.
  photoUrl: '',
  photoAlt: 'Jacaranda en floración',
  description:
    'Árbol ornamental de gran porte, popular en las avenidas de Valencia por su espectacular floración azul-violeta en primavera. Puede alcanzar hasta 15 metros de altura.',
  flowering: 'abr-jun',
  curiosity: {
    label: 'Dato curioso',
    text: 'sus flores caídas tienen las aceras de azul cada primavera, todo un símbolo de Valencia.',
  },
  locations: [
    {
      name: 'Parc Central',
      district: 'Ciutat Vella',
    },
  ],
  sources: [
    {
      name: 'Pl@ntNet (CIRAD, INRAE, INRIA, IRD)',
      description: 'Identificación por imagen · Consulta 06/10/2026',
      url: 'https://my.plantnet.org',
      icon: 'search',
    },
    {
      name: 'Ajuntament de València',
      description: 'Inventario de arbolado · Versión 09/10/2026',
      url: 'https://www.valencia.es',
      icon: 'landmark',
    },
  ],
};

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
