# Munster Stock v1.4.1

Aplicación web para el control diario de aguas, aguas saborizadas y gaseosas.

## Novedades de la versión 1.4.1

- Se retiró el dictado por voz, incluidos sus botones y código.
- Continúan el conteo manual, la vista «Para revisar», el buscador, WhatsApp, QR y PDF.

## Novedades de la versión 1.4

- Se agregaron Ives manzana sin gas, Ives pomelo gasificado, H2O manzana, H2O limoneto, H2O pomelo rosado y Fanta Zero.
- Se retiraron las antiguas aguas saborizadas genéricas de pomelo, manzana y limonada. Se conservaron pera y naranja, y Fanta común.
- Se retiraron Schweppes Pomelo y Schweppes Tónica; quedan las dos bebidas Paso de los Toros.
- Cada bebida se puede marcar «Revisar después». La pestaña «Para revisar» reúne las marcadas y permite modificar sus cantidades allí mismo.
- La marca se quita manualmente al terminar la revisión; «Nuevo conteo» borra todas las marcas. Las marcas no se guardan en un historial.

## Novedades de la versión 1.3

- Resumen de WhatsApp y QR separado en “ME FALTAN” y “ME SOBRAN”.
- Descarga opcional de un informe PDF.
- El PDF muestra bebida, sistema, total físico y diferencia.
- Los informes no se guardan ni se acumulan dentro de la aplicación.

## Novedades de la versión 1.2.1

- Buscador instantáneo de bebidas.
- Filtrado sin importar mayúsculas ni tildes.
- Contador de resultados.
- Botón para limpiar la búsqueda.
- Categorías que se ocultan cuando no contienen coincidencias.
- Buscador visible mientras se recorre la lista.

## Novedades de la versión 1.2

- Generación gratuita de un QR con el resumen del conteo.
- El QR abre WhatsApp en el celular que lo escanea con el mensaje preparado.
- Se conserva el botón para compartir directamente desde celulares.
- Nuevo ícono simplificado y elegante, optimizado para tamaños pequeños.

El generador QR incluido utiliza `qrcode-generator` de Kazuhiko Arase, bajo licencia MIT.
La generación de PDF utiliza `jsPDF`, bajo licencia MIT.

## Publicación con GitHub Pages

1. Subir todos estos archivos a la raíz del repositorio `Munster--stock`.
2. Entrar en **Settings**.
3. Entrar en **Pages**.
4. En **Build and deployment**, elegir **Deploy from a branch**.
5. Seleccionar rama **main** y carpeta **/(root)**.
6. Guardar.

La dirección será:

https://nad1alej0.github.io/Munster--stock/
