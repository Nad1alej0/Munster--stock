
const PRODUCTS = [["Aguas", "Agua sin gas"], ["Aguas", "Agua con gas"], ["Aguas saborizadas", "Agua saborizada pera"], ["Aguas saborizadas", "Agua saborizada naranja"], ["Aguas saborizadas", "Ives manzana sin gas"], ["Aguas saborizadas", "Ives pomelo gasificado"], ["Aguas saborizadas", "H2O manzana"], ["Aguas saborizadas", "H2O limoneto"], ["Aguas saborizadas", "H2O pomelo rosado"], ["Gaseosas", "Coca-Cola"], ["Gaseosas", "Coca-Cola Zero"], ["Gaseosas", "Pepsi"], ["Gaseosas", "Pepsi Black"], ["Gaseosas", "Fanta"], ["Gaseosas", "Fanta Zero"], ["Gaseosas", "Mirinda"], ["Gaseosas", "Sprite"], ["Gaseosas", "7 Up"], ["Tónicas y pomelos", "Paso de los Toros Tónica"], ["Tónicas y pomelos", "Paso de los Toros Pomelo"]];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const dateInput = $('#date');
const shiftInput = $('#shift');
const responsibleInput = $('#resp');
const productsContainer = $('#products');
const productSearch = $('#productSearch');
const clearSearch = $('#clearSearch');
const searchCount = $('#searchCount');
const noResults = $('#noResults');
let reviewOnly = false;

dateInput.value = new Date().toISOString().slice(0, 10);
$('#totalProducts').textContent = PRODUCTS.length;

const key = s => s
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .toLowerCase();

function render() {
  const groups = [...new Set(PRODUCTS.map(x => x[0]))];
  productsContainer.innerHTML = groups.map(group => `
    <section class="category">
      <h2>${group}</h2>
      ${PRODUCTS.filter(x => x[0] === group).map(([category, name]) => {
        const k = key(name);
        return `
          <article class="card" data-name="${name}">
            <label class="review-check">
              <input type="checkbox" data-review="${name}">
              <span>Revisar después</span>
            </label>
            <div class="title">
              <span class="product-name">${name}</span>
              <span class="status" id="st-${k}">Sin cargar</span>
            </div>
            <div class="grid">
              ${['Sistema', 'Salón', 'Depósito', 'Pasillo'].map(field => `
                <div>
                  <label>${field}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    data-p="${name}"
                    data-f="${field}"
                    placeholder="0">
                </div>
              `).join('')}
              <div>
                <label>Total físico</label>
                <div class="calc" id="tot-${k}">0</div>
              </div>
              <div>
                <label>Diferencia</label>
                <div class="calc" id="dif-${k}">0</div>
              </div>
            </div>
          </article>
        `;
      }).join('')}
    </section>
  `).join('');

  $$('input[data-p]').forEach(input => input.addEventListener('input', calculate));
  $$('input[data-review]').forEach(input => input.addEventListener('change', () => {
    updateReviewCount();
    filterProducts();
  }));
}

function filterProducts() {
  const query = normalize(productSearch.value.trim());
  let visibleCount = 0;

  $$('.category').forEach(section => {
    let categoryCount = 0;

    section.querySelectorAll('.card').forEach(card => {
      const searchableText = normalize(card.dataset.name);
      const matches = (!query || searchableText.includes(query)) &&
        (!reviewOnly || card.querySelector('input[data-review]').checked);

      card.hidden = !matches;
      if (matches) {
        categoryCount++;
        visibleCount++;
      }
    });

    section.hidden = categoryCount === 0;
  });

  clearSearch.hidden = !query;
  searchCount.textContent = `${visibleCount} ${visibleCount === 1 ? 'bebida' : 'bebidas'}`;
  $('#emptyReview').hidden = !reviewOnly || visibleCount !== 0 || Boolean(query);
  noResults.hidden = visibleCount !== 0 || (reviewOnly && !query);
}

function updateReviewCount() {
  const count = $$('input[data-review]:checked').length;
  $('#reviewCount').textContent = count;
}

$$('[data-view]').forEach(button => button.addEventListener('click', () => {
  reviewOnly = button.dataset.view === 'review';
  productSearch.value = '';
  $$('[data-view]').forEach(tab => {
    const active = tab === button;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  filterProducts();
}));

productSearch.addEventListener('input', () => {
  filterProducts();
});

clearSearch.addEventListener('click', () => {
  productSearch.value = '';
  filterProducts();
  productSearch.focus();
});

function value(product, field) {
  return Number(document.querySelector(
    `input[data-p="${product}"][data-f="${field}"]`
  )?.value || 0);
}

function calculate() {
  let ok = 0;
  let missing = 0;
  let extra = 0;

  PRODUCTS.forEach(([category, name]) => {
    const physical = value(name, 'Salón') + value(name, 'Depósito') + value(name, 'Pasillo');
    const system = value(name, 'Sistema');
    const difference = physical - system;
    const k = key(name);
    const card = document.querySelector(`[data-name="${name}"]`);
    const status = $(`#st-${k}`);

    $(`#tot-${k}`).textContent = physical;
    $(`#dif-${k}`).textContent = difference > 0 ? `+${difference}` : difference;

    const hasAnyValue = ['Sistema', 'Salón', 'Depósito', 'Pasillo'].some(field =>
      document.querySelector(`input[data-p="${name}"][data-f="${field}"]`).value !== ''
    );

    status.className = 'status';
    card.className = 'card';

    if (!hasAnyValue) {
      status.textContent = 'Sin cargar';
    } else if (difference === 0) {
      status.textContent = 'Correcto';
      status.classList.add('ok');
      card.classList.add('state-ok');
      ok++;
    } else if (difference < 0) {
      status.textContent = `Faltan ${Math.abs(difference)}`;
      status.classList.add('bad');
      card.classList.add('state-bad');
      missing++;
    } else {
      status.textContent = `Sobran ${difference}`;
      status.classList.add('warn');
      card.classList.add('state-warn');
      extra++;
    }
  });

  $('#okc').textContent = ok;
  $('#missc').textContent = missing;
  $('#extrac').textContent = extra;
}

function collectData() {
  return {
    date: dateInput.value,
    shift: shiftInput.value,
    responsible: responsibleInput.value.trim(),
    items: PRODUCTS.map(([category, name]) => {
      const physical = value(name, 'Salón') + value(name, 'Depósito') + value(name, 'Pasillo');
      const system = value(name, 'Sistema');
      return {
        category,
        name,
        system,
        physical,
        difference: physical - system
      };
    })
  };
}

$('#reset').addEventListener('click', () => {
  const accepted = confirm(
    '¿Querés comenzar un nuevo conteo? Esto limpiará todos los campos actuales.'
  );
  if (!accepted) return;

  $$('input[data-p]').forEach(input => input.value = '');
  $$('input[data-review]').forEach(input => input.checked = false);
  updateReviewCount();
  reviewOnly = false;
  $$('[data-view]').forEach(tab => {
    const active = tab.dataset.view === 'all';
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  responsibleInput.value = '';
  dateInput.value = new Date().toISOString().slice(0, 10);
  productSearch.value = '';
  filterProducts();
  calculate();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function shareText(data) {
  const loaded = data.items.filter(item => {
    const productInputs = $$(`input[data-p="${item.name}"]`);
    return productInputs.some(input => input.value !== '');
  });

  const differences = loaded.filter(item => item.difference !== 0);
  const correct = loaded.filter(item => item.difference === 0).length;

  const formattedDate = data.date
    ? data.date.split('-').reverse().join('/')
    : 'Sin indicar';
  const missing = differences.filter(item => item.difference < 0).length;
  const extra = differences.filter(item => item.difference > 0).length;

  let text = '☘️ *MUNSTER STOCK*\n\n';
  text += `📅 Fecha: ${formattedDate}\n`;
  text += `🕐 Turno: ${data.shift}\n`;
  text += `👤 Responsable: ${data.responsible || 'Sin indicar'}\n\n`;
  text += `📦 Productos controlados: ${loaded.length}\n`;
  text += `✅ Correctos: ${correct}\n`;
  text += `🔴 Con faltantes: ${missing}\n`;
  text += `🟡 Con sobrantes: ${extra}\n`;

  if (differences.length) {
    const missingItems = differences.filter(item => item.difference < 0);
    const extraItems = differences.filter(item => item.difference > 0);

    if (missingItems.length) {
      text += '\n🔴 *ME FALTAN*\n';
      missingItems.forEach(item => {
        text += `• ${item.name}: ${Math.abs(item.difference)}\n`;
      });
    }

    if (extraItems.length) {
      text += '\n🟡 *ME SOBRAN*\n';
      extraItems.forEach(item => {
        text += `• ${item.name}: ${item.difference}\n`;
      });
    }
  } else if (loaded.length) {
    text += '\n✅ Todo el stock físico coincide con el sistema.';
  } else {
    text += '\n⚠️ No se cargaron productos.';
  }

  return text;
}

function loadedItems(data) {
  return data.items.filter(item => {
    const productInputs = $$(`input[data-p="${item.name}"]`);
    return productInputs.some(input => input.value !== '');
  });
}

function safeFilenamePart(value) {
  return (value || 'Sin-responsable')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function downloadPdf(data) {
  if (!window.jspdf?.jsPDF) {
    alert('No pude preparar el PDF. Actualizá la aplicación y volvé a intentar.');
    return;
  }

  const items = loadedItems(data);
  if (!items.length) {
    alert('Primero cargá al menos una bebida para generar el PDF.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;
  const formattedDate = data.date
    ? data.date.split('-').reverse().join('/')
    : 'Sin indicar';
  const missingItems = items.filter(item => item.difference < 0);
  const extraItems = items.filter(item => item.difference > 0);
  const correct = items.filter(item => item.difference === 0).length;
  let y = 0;

  function header() {
    doc.setFillColor(18, 60, 46);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text('MUNSTER STOCK', margin, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Informe de control de bebidas', margin, 21);
    doc.setTextColor(24, 33, 29);
    y = 40;
  }

  function newPageIfNeeded(requiredHeight) {
    if (y + requiredHeight <= pageHeight - 15) return;
    doc.addPage();
    header();
  }

  function sectionTitle(title, color) {
    newPageIfNeeded(13);
    doc.setFillColor(...color);
    doc.roundedRect(margin, y, usableWidth, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, margin + 4, y + 6);
    doc.setTextColor(24, 33, 29);
    y += 13;
  }

  function differenceList(title, list, color) {
    if (!list.length) return;
    sectionTitle(title, color);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    list.forEach(item => {
      newPageIfNeeded(7);
      const amount = Math.abs(item.difference);
      doc.text(`• ${item.name}: ${amount}`, margin + 3, y + 4);
      y += 7;
    });
    y += 3;
  }

  header();

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', margin, y);
  doc.text('Turno:', margin + 62, y);
  doc.text('Responsable:', margin + 112, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formattedDate, margin + 15, y);
  doc.text(data.shift || 'Sin indicar', margin + 76, y);
  doc.text(data.responsible || 'Sin indicar', margin + 137, y);
  y += 10;

  const boxWidth = (usableWidth - 9) / 4;
  const totals = [
    ['Controlados', items.length],
    ['Correctos', correct],
    ['Faltantes', missingItems.length],
    ['Sobrantes', extraItems.length]
  ];
  totals.forEach(([label, number], index) => {
    const x = margin + index * (boxWidth + 3);
    doc.setFillColor(244, 247, 245);
    doc.roundedRect(x, y, boxWidth, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(String(number), x + boxWidth / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(label, x + boxWidth / 2, y + 14, { align: 'center' });
  });
  y += 25;

  differenceList('ME FALTAN', missingItems, [179, 38, 30]);
  differenceList('ME SOBRAN', extraItems, [184, 125, 16]);

  sectionTitle('DETALLE DEL CONTEO', [18, 60, 46]);
  const columns = [margin, margin + 83, margin + 112, margin + 148, pageWidth - margin];

  function tableHeader() {
    doc.setFillColor(234, 244, 239);
    doc.rect(margin, y, usableWidth, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Bebida', columns[0] + 2, y + 6);
    doc.text('Sistema', columns[2] - 2, y + 6, { align: 'right' });
    doc.text('Físico', columns[3] - 2, y + 6, { align: 'right' });
    doc.text('Diferencia', columns[4] - 2, y + 6, { align: 'right' });
    y += 9;
  }

  tableHeader();
  items.forEach((item, index) => {
    if (y + 8 > pageHeight - 15) {
      doc.addPage();
      header();
      tableHeader();
    }
    if (index % 2 === 1) {
      doc.setFillColor(248, 249, 248);
      doc.rect(margin, y, usableWidth, 8, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const name = doc.splitTextToSize(item.name, 78)[0];
    doc.text(name, columns[0] + 2, y + 5.5);
    doc.text(String(item.system), columns[2] - 2, y + 5.5, { align: 'right' });
    doc.text(String(item.physical), columns[3] - 2, y + 5.5, { align: 'right' });
    const difference = item.difference > 0 ? `+${item.difference}` : String(item.difference);
    if (item.difference < 0) doc.setTextColor(179, 38, 30);
    else if (item.difference > 0) doc.setTextColor(169, 96, 0);
    else doc.setTextColor(46, 125, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(difference, columns[4] - 2, y + 5.5, { align: 'right' });
    doc.setTextColor(24, 33, 29);
    doc.setDrawColor(223, 230, 226);
    doc.line(margin, y + 8, pageWidth - margin, y + 8);
    y += 8;
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(104, 117, 111);
    doc.text(`Munster Stock • Página ${page} de ${pageCount}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
  }

  const dateForFile = data.date || new Date().toISOString().slice(0, 10);
  const filename = `Munster-Stock_${dateForFile}_${safeFilenamePart(data.shift)}_${safeFilenamePart(data.responsible)}.pdf`;
  doc.save(filename);
}

$('#downloadPdf').addEventListener('click', () => downloadPdf(collectData()));

$('#share').addEventListener('click', async () => {
  const text = shareText(collectData());

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Munster Stock', text });
      return;
    } catch (error) {
      // El usuario puede cancelar el selector de compartir.
    }
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
});

const qrModal = $('#qrModal');
const qrCode = $('#qrCode');
const qrPreview = $('#qrPreview');

function closeQrModal() {
  qrModal.hidden = true;
  document.body.classList.remove('modal-open');
}

$('#showQr').addEventListener('click', () => {
  const text = shareText(collectData());

  if (!window.qrcode) {
    alert('No pude generar el QR. Actualizá la aplicación y volvé a intentar.');
    return;
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  try {
    const qr = qrcode(0, 'M');
    qr.addData(whatsappUrl);
    qr.make();
    qrCode.innerHTML = qr.createSvgTag({
      cellSize: 5,
      margin: 4,
      scalable: true
    });
    qrPreview.textContent = text;
    qrModal.hidden = false;
    document.body.classList.add('modal-open');
    $('#closeQr').focus();
  } catch (error) {
    alert('El resumen es demasiado largo para generar el QR. Compartilo directamente por WhatsApp.');
  }
});

$('#closeQr').addEventListener('click', closeQrModal);
$('#closeQrBottom').addEventListener('click', closeQrModal);
qrModal.addEventListener('click', event => {
  if (event.target === qrModal) closeQrModal();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !qrModal.hidden) closeQrModal();
});

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}


render();
calculate();
filterProducts();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js'));
}
