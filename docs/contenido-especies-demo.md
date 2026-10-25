# Contenido de especies para la demo (UT 918 - F06 · RF3 · RNF6)

**UT 918 — F06. Preparar textos de especies botánicas del MVP.**

Recopilación del contenido que mostrará la ficha de planta (RF3) en la demo, con la
**fuente de cada texto y foto** anotada, según el requisito no funcional RNF6
(*"Fiabilidad y trazabilidad: fuentes visibles y datos verificados"*).

- Contenido colocado en: `src/pages/FichaPlanta/constants.ts` (array `DEMO_SPECIES`).
- Fecha de consulta y verificación de todas las fuentes: **25/10/2026**.
- Criterio de selección: especies con presencia real y abundante en el **Inventario
  de Arbolado del Ajuntament de València** (ArcGIS REST
  `…/OPENDATA/MedioAmbiente/MapServer/151/query`, datos publicados bajo CC BY 4.0), para que
  la demo se ancle a la fuente de datos oficial (RNF1) y no a supuestos.

## Cómo se verificó cada dato

| Tipo de dato | Fuente | Forma de verificación |
|---|---|---|
| Descripción y curiosidades | Wikipedia en español (CC BY-SA) | Texto adaptado de las secciones de cada artículo (introducción, *Descripción*, *Historia*, *Usos* según especie); cada ficha enlaza su artículo |
| Familia botánica | Wikipedia / Wikidata (propiedad `P171`) | Confirmación individual por especie |
| Nombre común (castellano/valenciano), distrito y barrio | Inventario de Arbolado (Ajuntament de València) | Consulta `geojson` con `outFields=…,distrito,barrio` |
| Recuento de ejemplares por especie | Inventario de Arbolado (Ajuntament de València) | Consulta `returnCountOnly` con `nom_botanico LIKE '<binomial>%'` (total del inventario al consultar: 157.649 árboles) |
| Foto | Wikimedia Commons | Licencia y autor extraídos de los `extmetadata` de la imagen y foto revisada visualmente |

Las URLs de las miniaturas usan **500 px**, uno de los tamaños estándar admitidos por el CDN
de Wikimedia para hotlinks (20/40/60/120/250/330/500/960/1280/1920/3840 px; ver
<https://w.wiki/GHai>).

## Especies de la demo

### 1. Jacaranda (Jacaranda mimosifolia) — familia Bignoniaceae

- Ejemplares en el inventario: **5.253** · Ejemplo real: barrio Vara de Quart (Patraix).
- Descripción (adaptada de <https://es.wikipedia.org/wiki/Jacaranda_mimosifolia>, secciones
  introducción y *Descripción*): árbol subtropical sudamericano (Argentina, Brasil, Bolivia y
  Paraguay) de 12–15 m (hasta 20 m en condiciones favorables) con copa irregular en sombrilla y
  sombra de intensidad media; flores azul violeta de 4–5 cm en panículas erectas de 20–30 cm
  que cubren la copa antes de la foliación, con una segunda floración estival más escasa.
- Curiosidad (fuente Wikipedia, sección *Descripción*): el fruto es una cápsula leñosa en forma
  de castañuela; en guaraní, *ka-í jepopeté* («aplauso de mono»).
- Floración: primavera (verificada en el artículo; prudencia con el rango mensual, el
  inventario local puede desplazarse unos días según la primavera).
- Foto: <https://commons.wikimedia.org/wiki/File:Jacaranda1212.jpg> — **Kahuroa · dominio
  público**. Revisada visualmente: árbol completo en plena floración violeta.

### 2. Naranjo amargo (Citrus × aurantium) — familia Rutaceae

- Ejemplares en el inventario: **12.661** · Ejemplo real: barrio Benicalap (Benicalap). El
  inventario lo llama `Naranjo amargo` / `Taronger bord`.
- Descripción (adaptada de <https://es.wikipedia.org/wiki/Citrus_%C3%97_aurantium>, secciones
  introducción, *Historia* y *Usos*): perennifolio de 7–8 m con espinas axilares; híbrido entre
  Citrus maxima y Citrus reticulata surgido en el sudeste asiático y extendido por India, Persia
  y el mundo árabe desde el año 700, llegando a Iberia con la expansión musulmana; aceite
  esencial para perfumes, saborizantes y medicina; nombres populares de la naranja amarga
  (Sevilla, cajera, cachorreña…).
- Curiosidad (fuente Wikipedia, secciones *Historia* y *Portainjerto*): portainjerto preferido
  de los cítricos comerciales; su naranja, con más pectina que la dulce, es la de la mermelada
  de Sevilla que se envía a Inglaterra.
- Floración: sin dato verificado en el artículo → la ficha muestra el chip vacío
  (`flowering: ''`); la codificación de meses queda pendiente para RF9.
- Foto: <https://commons.wikimedia.org/wiki/File:Bitter_orange_-_Citrus_×_aurantium_03.jpg> —
  **Zeynel Cebeci · CC BY-SA 4.0**. Revisada visualmente: racimos de naranjas amargas en la
  copa. (La foto del artículo, un grabado de Köhler, se apartó por no ser fotográfica.)

### 3. Palmera datilera (Phoenix dactylifera) — familia Arecaceae

- Ejemplares en el inventario: **7.565** · Ejemplo real: barrio Russafa (L'Eixample).
- Descripción (adaptada de <https://es.wikipedia.org/wiki/Phoenix_dactylifera>, secciones
  introducción y *Usos*): palmera del dátil, probablemente oriunda del suroeste de Asia; una de
  las más notables del género Phoenix (unas quince especies desde Canarias hasta Extremo
  Oriente); comercial por sus frutos y ornamental en zonas costeras cálidas, aislada o en
  palmerales; sus hojas (palmas) se usan en el Domingo de Ramos en España y sus vainas dan
  fibra para cuerda y tela gruesa.
- Curiosidad (fuente Wikipedia, sección *Usos* y apartado de producción): sus hojas —las
  *palmas*— son las del Domingo de Ramos en España; en Elche llegó a haber la mayor producción
  de dátil in vitro del mundo.
- Familia confirmada por Wikidata: cadena `P171` de Q25292 (la propia Wikipedia aplica texto
  equivalente).
- Foto: <https://commons.wikimedia.org/wiki/File:Phoenix_dactylifera_Daktylowiec_właściwy_2023-02-24_09.jpg>
  — **Agnieszka Kwiecień, Nova · CC BY-SA 4.0**. Revisada visualmente: racimos de dátiles
  pendurados. (Se descartó la foto llena de dunas que traía el artículo por no representar el
  uso urbano.)

### 4. Laurel de Indias (Ficus microcarpa) — familia Moraceae

- Ejemplares en el inventario: **3.157** · Ejemplo real: barrio Sant Francesc (Ciutat Vella).
- Descripción (adaptada de <https://es.wikipedia.org/wiki/Ficus_microcarpa>, secciones
  introducción y *Descripción*: perenne de gran porte y rápido crecimiento, supera los 15 m con
  copa voluminosa y raíces aéreas que se unen al tronco; árbol de sombra en calles de climas
  cálidos y subtropicales; en España desde la costa de Cádiz a la de Valencia, Baleares y
  Canarias; también de interior y como bonsái.
- Curiosidad (fuente Wikipedia, secciones *Descripción* y *Ecología*): los jóvenes pueden
  germinar sobre muros y estructuras de hormigón; considerada invasiva en varias regiones.
- Familia (Moraceae) confirmada por Wikidata (`Q714180 → Ficus → Moraceae`).
- Foto: <https://commons.wikimedia.org/wiki/File:Ficus_microcarpa_-_La_Gomera_02.jpg> —
  **H. Zell · CC BY-SA 3.0**. Revisada visualmente: copa-redonda típicamente urbana en rotonda.
  (Se descartó la lámina de Blanco que traía el artículo.)

### 5. Plátano de sombra (Platanus × hispanica) — familia Platanaceae

- Ejemplares en el inventario: **9.947** · Ejemplo real: barrio Campanar (Campanar). El
  inventario escribe `Platanus x hispanica` (con `x` ASCII); Wikipedia usa el signo `×`.
- Descripción (adaptada de <https://es.wikipedia.org/wiki/Platanus_%C3%97_hispanica>, secciones
  introducción *Origen* y *Cultivo*): hasta 55 m de alto y hasta 500 años de vida; híbrido de
  Platanus orientalis y P. occidentalis (o cultivar de P. orientalis según otros autores),
  origen discutido; común en parques y jardines de todo el mundo templado por su agradable
  sombra; plantado antiguamente en cunetas de carretera para dar sombra a carros y diligencias
  en los veranos mediterráneos; problemática alergénica a considerar al plantarlo.
- Curiosidad (fuente Wikipedia, sección *Usos* y apartado general): antes del automóvil se
  plantaba en cunetas para sombra de carros y diligencias en los veranos mediterráneos; puede
  vivir hasta 500 años. El artículo advierte además de su problemática alergénica (dato a
  tener en cuenta, no incluido en la ficha de la demo).
- Foto: <https://commons.wikimedia.org/wiki/File:Platanus.JPG> — **Tiago Fioreze ·
  CC BY-SA 3.0**. Revisada visualmente: filera de plátanos de sombra.

### 6. Tipuana (Tipuana tipu) — familia Fabaceae

- Ejemplares en el inventario: **2.955** · Ejemplo real: barrio La Vega Baixa (Algirós).
- Descripción (adaptada de <https://es.wikipedia.org/wiki/Tipuana_tipu>, secciones introducción
  y *Cultivo*): semicaducifolio de las Fabaceae, única especie del género Tipuana, originaria de
  Argentina y Bolivia; resiste la sequía sin perder las hojas; floración amarilla, julio-agosto
  en el hemisferio norte; frecuente en calles anchas, avenidas y paseos por su floración y su
  buena sombra; raíces robustas y extensas (no se aconseja plantarlo junto a edificios); madera
  para muebles, puertas y escaleras.
- Curiosidad (fuente Wikipedia, sección *Cultivo*): raíces robustas y extensas (no se aconseja
  plantarlo junto a edificios); en Argentina, la chicharrita *Cephisus siccifolius* conoce el
  fenómeno del «llanto de las tipas» (gotas azucaradas excretadas).
- Floración: el artículo indica florescencia en **jul-ago** en el hemisferio norte.
- Foto: <https://commons.wikimedia.org/wiki/File:Tipuana_tipu_kedumim_2.JPG> — **Daniel
  Ventura · CC BY-SA 3.0**. Revisada visualmente: Tipuana en floración amarilla.

## Procedencia pendiente para la ficha "de verdad"

- La ficha sigue leyendo los datos de `constants.ts` hasta que exista el endpoint de ficha con
  el modelo de dominio. Como ya existe en backend (rama `explore_open_data`) una tabla
  `species` con `description`, `cultural_extract`, `image_url`, `source`, `fetched_at`
  (Wikipedia/Wikidata), lo natural es: (1) ontener los recuentos de especie desde esa tabla
  tras importar arbolado municipal, (2) añadir ahí autor y licencia de la foto (los
  `extmetadata` de Commons, tal como se hace en este documento, sin depender de "la photo del
  artículo").
- El texto de los artículos se muestra **adaptado**, no literal: si en algún momento se
  muestra el extracto íntegro de Wikipedia, mantener la atribución
  («fuente: Wikipedia — CC BY-SA»).
- Todos los créditos de foto que la ficha muestra son también visibles en la sección «Fuentes
  de información» (entrada de Wikimedia Commons) para cumplir con RNF6 "fuentes visibles".
- Traducciones (es/va/en) de esta ficha: pendientes de la UT44; los textos están solo en
  castellano.
