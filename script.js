
    (function() {
      "use strict";

      // ---------- helpers ----------
      const categoryEmoji = { food:'🍔', transport:'🚗', shopping:'🛍️', bills:'📄', entertainment:'🎬', other:'📌', income:'💰' };
      const categoryColors = { food:'#f97316', transport:'#3b82f6', shopping:'#8b5cf6', bills:'#ef4444', entertainment:'#ec4899', other:'#6b7280', income:'#22c55e' };
      const formatCurrency = (v) => v.toFixed(2);

      // ---------- state ----------
      let expenses = [];
      let editingId = null;
      let editDesc = '', editAmount = '', editCategory = 'food', editType = 'expense';
      let description = '', amount = '', category = 'food', entryType = 'expense';
      let search = '', filterCategory = 'all', filterType = 'all', monthlyFilter = 'all';
      let darkMode = localStorage.getItem('darkMode') === 'true';
      let toasts = [];
      let sidebarOpen = true;

      // chart instances
      let donutChart = null, barChart = null;

      // DOM refs (cached)
      const $ = (sel) => document.querySelector(sel);
      const $$ = (sel) => document.querySelectorAll(sel);

      // ---------- toast ----------
      function showToast(message, type = 'info', icon = null) {
        const icons = { success:'bi-check-circle-fill', error:'bi-exclamation-circle-fill', info:'bi-info-circle-fill' };
        const id = Date.now() + Math.random();
        toasts.push({ id, message, type, icon: icon || icons[type] || icons.info });
        renderToasts();
        setTimeout(() => {
          toasts = toasts.filter(t => t.id !== id);
          renderToasts();
        }, 4000);
      }

      function removeToast(id) {
        toasts = toasts.filter(t => t.id !== id);
        renderToasts();
      }

      function renderToasts() {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        container.innerHTML = toasts.map(t =>
          `<div class="toast-custom ${t.type}">
            <i class="bi ${t.icon}"></i> ${t.message}
            <button class="btn-close btn-close-white ms-auto" style="filter:none;opacity:0.6" data-toast-id="${t.id}"></button>
          </div>`
        ).join('');
        container.querySelectorAll('.btn-close').forEach(btn => {
          btn.addEventListener('click', () => removeToast(parseFloat(btn.dataset.toastId)));
        });
      }

      // ---------- localStorage ----------
      function loadExpenses() {
        const saved = localStorage.getItem('expenses');
        if (saved) {
          try { expenses = JSON.parse(saved); } catch(e) { expenses = []; }
        } else {
          expenses = [
            // { id:1, description:'Grocery store', amount:-48.75, category:'food', createdAt:new Date().toISOString() },
            // { id:2, description:'Gas station', amount:-32.00, category:'transport', createdAt:new Date().toISOString() },
            // { id:3, description:'Netflix', amount:-15.99, category:'entertainment', createdAt:new Date().toISOString() },
            // { id:4, description:'Salary', amount:1250.00, category:'income', createdAt:new Date().toISOString() },
            // { id:5, description:'New sneakers', amount:-89.00, category:'shopping', createdAt:new Date().toISOString() },
            // { id:6, description:'Freelance payment', amount:320.00, category:'income', createdAt:new Date().toISOString() },
            // { id:7, description:'Electric bill', amount:-75.40, category:'bills', createdAt:new Date().toISOString() },
          ];
        }
      }
      function saveExpenses() {
        localStorage.setItem('expenses', JSON.stringify(expenses));
      }

      // ---------- computed totals ----------
      function getTotals() {
        let income=0, expense=0;
        expenses.forEach(e => { if(e.amount>=0) income+=e.amount; else expense+=Math.abs(e.amount); });
        return { income, expense, balance: income - expense };
      }

      // ---------- filtered expenses ----------
      function getFiltered() {
        let list = expenses.slice();
        if (monthlyFilter !== 'all') {
          const now = new Date();
          const targetMonth = parseInt(monthlyFilter);
          list = list.filter(e => {
            const d = new Date(e.createdAt || Date.now());
            return d.getMonth() === targetMonth && d.getFullYear() === now.getFullYear();
          });
        }
        if (search.trim()) {
          const s = search.toLowerCase().trim();
          list = list.filter(e => e.description.toLowerCase().includes(s));
        }
        if (filterCategory !== 'all') list = list.filter(e => e.category === filterCategory);
        if (filterType === 'income') list = list.filter(e => e.amount > 0);
        else if (filterType === 'expense') list = list.filter(e => e.amount < 0);
        return list;
      }

      // ---------- render ----------
      function render() {
        const app = document.getElementById('app');
        const filtered = getFiltered();
        const totals = getTotals();
        const monthOptions = ['All months', ...Array.from({length:12}, (_,i) => new Date(0, i).toLocaleString('default', { month:'long' }))];

        app.innerHTML = `
          <div class="container-fluid p-3 p-md-4">
            <div class="row g-4">
              <!-- Sidebar -->
              <div class="col-12 col-md-3 col-lg-2 ${sidebarOpen ? '' : 'd-none d-md-block'}">
                <div class="tracker-card h-100" style="padding:1.2rem">
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="fw-bold mb-0"><i class="bi bi-sliders2 me-2"></i>Filters</h6>
                    <button class="sidebar-toggle d-md-none" id="closeSidebarBtn"><i class="bi bi-x-lg"></i></button>
                  </div>
                  <div class="mb-3">
                    <label class="form-label small fw-semibold">Search</label>
                    <input type="text" class="form-control form-control-sm rounded-pill" id="searchInput" placeholder="Search..." value="${search}" />
                  </div>
                  <div class="mb-3">
                    <label class="form-label small fw-semibold">Category</label>
                    <select class="form-select form-select-sm rounded-pill" id="filterCategorySelect">
                      <option value="all" ${filterCategory==='all'?'selected':''}>All</option>
                      ${Object.keys(categoryEmoji).map(c => `<option value="${c}" ${filterCategory===c?'selected':''}>${categoryEmoji[c]} ${c}</option>`).join('')}
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label small fw-semibold">Type</label>
                    <select class="form-select form-select-sm rounded-pill" id="filterTypeSelect">
                      <option value="all" ${filterType==='all'?'selected':''}>All</option>
                      <option value="income" ${filterType==='income'?'selected':''}>Income</option>
                      <option value="expense" ${filterType==='expense'?'selected':''}>Expense</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label small fw-semibold">Month</label>
                    <select class="form-select form-select-sm rounded-pill" id="monthlyFilterSelect">
                      ${monthOptions.map((m,i) => `<option value="${i===0?'all':i-1}" ${(i===0 && monthlyFilter==='all') || (i>0 && monthlyFilter==(i-1).toString())?'selected':''}>${m}</option>`).join('')}
                    </select>
                  </div>
                  <hr class="my-2" />
                  <div class="d-flex flex-column gap-2">
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" id="pdfBtn"><i class="bi bi-file-pdf me-1"></i> PDF</button>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" id="excelBtn"><i class="bi bi-file-excel me-1"></i> Excel</button>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" id="darkToggleBtn"><i class="bi ${darkMode?'bi-sun':'bi-moon'} me-1"></i> ${darkMode?'Light':'Dark'}</button>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" id="resetFiltersBtn"><i class="bi bi-arrow-counterclockwise me-1"></i> Reset</button>
                  </div>
                </div>
              </div>

              <!-- Main -->
              <div class="col-12 ${sidebarOpen ? 'col-md-9 col-lg-10' : 'col-md-12'}">
                <div class="tracker-card">
                  <!-- Header -->
                  <div class="d-flex flex-wrap align-items-center justify-content-between mb-3">
                    <div class="d-flex align-items-center gap-2">
                      <button class="sidebar-toggle d-md-none" id="openSidebarBtn"><i class="bi bi-list"></i></button>
                      <h1 class="h4 fw-semibold d-flex align-items-center gap-2 mb-0">
                        <i class="bi bi-wallet2" style="color:#2a7de1"></i>
                        Expense<span class="fw-light text-secondary">·</span>Track
                      </h1>
                    </div>
                    <div class="balance-badge"><i class="bi bi-coin"></i> ${formatCurrency(totals.balance)}</div>
                  </div>

                  <!-- Summary -->
                  <div class="row g-2 mb-3">
                    <div class="col-4"><div class="summary-card"><div class="summary-label"><i class="bi bi-arrow-up-short me-1"></i>income</div><div class="summary-value income-color">${formatCurrency(totals.income)}</div></div></div>
                    <div class="col-4"><div class="summary-card"><div class="summary-label"><i class="bi bi-arrow-down-short me-1"></i>expenses</div><div class="summary-value expense-color">${formatCurrency(totals.expense)}</div></div></div>
                    <div class="col-4"><div class="summary-card"><div class="summary-label"><i class="bi bi-scale me-1"></i>balance</div><div class="summary-value balance-color">${formatCurrency(totals.balance)}</div></div></div>
                  </div>

                  <!-- Charts -->
                  <div class="mb-3">
                    <div class="row g-3">
                      <div class="col-12 col-md-6"><div class="chart-container"><h6 class="fw-semibold mb-1 text-secondary" style="font-size:0.8rem"><i class="bi bi-pie-chart me-1"></i>Expense by category</h6><canvas id="donutChart" height="160"></canvas></div></div>
                      <div class="col-12 col-md-6"><div class="chart-container"><h6 class="fw-semibold mb-1 text-secondary" style="font-size:0.8rem"><i class="bi bi-bar-chart me-1"></i>Income vs Expenses</h6><canvas id="barChart" height="160"></canvas></div></div>
                    </div>
                  </div>

                  <!-- Add form -->
                  <div class="bg-white p-3 rounded-4 shadow-sm mb-3 add-form-card border border-light">
                    <div class="row g-2 align-items-end">
                      <div class="col-12 col-md-4">
                        <label class="form-label small fw-semibold text-secondary">Description</label>
                        <input id="descInput" type="text" class="form-control rounded-pill border-0 bg-light" placeholder="e.g. Groceries" value="${description}" />
                      </div>
                      <div class="col-6 col-md-2">
                        <label class="form-label small fw-semibold text-secondary">Amount</label>
                        <input id="amountInput" type="number" class="form-control rounded-pill border-0 bg-light" placeholder="0.00" min="0.01" step="0.01" value="${amount}" />
                      </div>
                      <div class="col-6 col-md-2">
                        <label class="form-label small fw-semibold text-secondary">Type</label>
                        <div class="type-toggle-group d-flex" id="typeToggle">
                          <button class="btn btn-sm ${entryType==='expense'?'active-type':''}" data-type="expense"><i class="bi bi-arrow-down-short me-1"></i>Exp</button>
                          <button class="btn btn-sm ${entryType==='income'?'active-type':''}" data-type="income"><i class="bi bi-arrow-up-short me-1"></i>Inc</button>
                        </div>
                      </div>
                      <div class="col-6 col-md-2">
                        <label class="form-label small fw-semibold text-secondary">Category</label>
                        <select id="categorySelect" class="form-select rounded-pill border-0 bg-light" ${entryType==='income'?'disabled':''}>
                          ${Object.keys(categoryEmoji).filter(c=>c!=='income').map(c => `<option value="${c}" ${category===c?'selected':''}>${categoryEmoji[c]} ${c}</option>`).join('')}
                        </select>
                      </div>
                      <div class="col-6 col-md-2">
                        <button class="btn btn-dark rounded-pill w-100 fw-semibold py-1" id="addBtn"><i class="bi bi-plus-circle me-1"></i> Add</button>
                      </div>
                    </div>
                  </div>

                  <!-- Edit inline -->
                  ${editingId ? `
                  <div class="bg-light p-3 rounded-4 mb-3 border" id="editPanel">
                    <h6 class="fw-semibold mb-2"><i class="bi bi-pencil me-2"></i>Edit Entry</h6>
                    <div class="row g-2">
                      <div class="col-12 col-md-4"><input type="text" class="form-control form-control-sm rounded-pill" id="editDesc" value="${editDesc}" placeholder="Description" /></div>
                      <div class="col-6 col-md-2"><input type="number" class="form-control form-control-sm rounded-pill" id="editAmount" value="${editAmount}" placeholder="Amount" min="0.01" step="0.01" /></div>
                      <div class="col-6 col-md-2">
                        <select class="form-select form-select-sm rounded-pill" id="editTypeSelect">
                          <option value="expense" ${editType==='expense'?'selected':''}>Expense</option>
                          <option value="income" ${editType==='income'?'selected':''}>Income</option>
                        </select>
                      </div>
                      <div class="col-6 col-md-2">
                        <select class="form-select form-select-sm rounded-pill" id="editCategorySelect" ${editType==='income'?'disabled':''}>
                          ${Object.keys(categoryEmoji).filter(c=>c!=='income').map(c => `<option value="${c}" ${editCategory===c?'selected':''}>${categoryEmoji[c]} ${c}</option>`).join('')}
                        </select>
                      </div>
                      <div class="col-6 col-md-2 d-flex gap-1">
                        <button class="btn btn-sm btn-success rounded-pill flex-fill" id="saveEditBtn"><i class="bi bi-check"></i></button>
                        <button class="btn btn-sm btn-secondary rounded-pill flex-fill" id="cancelEditBtn"><i class="bi bi-x"></i></button>
                      </div>
                    </div>
                  </div>` : ''}

                  <!-- List -->
                  <div class="d-flex justify-content-between align-items-baseline mb-2">
                    <h6 class="fw-semibold mb-0"><i class="bi bi-list-ul me-2" style="color:#2a7de1"></i>entries (${filtered.length})</h6>
                    <span class="small text-secondary bg-light px-3 py-1 rounded-pill">${expenses.length} total</span>
                  </div>
                  <div class="scroll-list" id="expenseList">
                    ${filtered.length === 0 ? `
                      <div class="empty-state"><i class="bi bi-receipt fs-2 d-block mb-2 opacity-50"></i><p class="mb-0">No entries match</p></div>
                    ` : filtered.map(exp => {
                      const cat = exp.category || 'other';
                      const isNeg = exp.amount < 0;
                      const isInc = exp.amount > 0;
                      return `
                        <div class="expense-item mb-2" data-id="${exp.id}">
                          <div class="d-flex align-items-center gap-2 flex-wrap">
                            <span class="expense-category-badge">${categoryEmoji[cat]||'📌'} ${cat}</span>
                            <span class="fw-medium text-dark">${exp.description}</span>
                            ${isInc ? `<span class="badge bg-success bg-opacity-10 text-success rounded-pill px-2 py-0"><i class="bi bi-arrow-up-short"></i> income</span>` : ''}
                          </div>
                          <div class="d-flex align-items-center gap-1">
                            <span class="expense-amount ${isNeg?'negative':(isInc?'positive':'')}">${isNeg?'-':(isInc?'+':'')}${formatCurrency(Math.abs(exp.amount))}</span>
                            <button class="edit-btn" data-action="edit" data-id="${exp.id}"><i class="bi bi-pencil"></i></button>
                            <button class="delete-btn" data-action="delete" data-id="${exp.id}"><i class="bi bi-trash3"></i></button>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            </div>
            <div class="toast-container" id="toastContainer"></div>
          </div>
        `;

        // ---------- attach events ----------
        // Sidebar
        document.getElementById('openSidebarBtn')?.addEventListener('click', () => { sidebarOpen = true; render(); });
        document.getElementById('closeSidebarBtn')?.addEventListener('click', () => { sidebarOpen = false; render(); });

        // Search
        document.getElementById('searchInput')?.addEventListener('input', (e) => { search = e.target.value; render(); });
        document.getElementById('filterCategorySelect')?.addEventListener('change', (e) => { filterCategory = e.target.value; render(); });
        document.getElementById('filterTypeSelect')?.addEventListener('change', (e) => { filterType = e.target.value; render(); });
        document.getElementById('monthlyFilterSelect')?.addEventListener('change', (e) => { monthlyFilter = e.target.value; render(); });

        // Dark mode
        document.getElementById('darkToggleBtn')?.addEventListener('click', () => {
          darkMode = !darkMode;
          localStorage.setItem('darkMode', JSON.stringify(darkMode));
          document.body.classList.toggle('dark-mode', darkMode);
          render();
        });

        // Reset filters
        document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
          search = ''; filterCategory = 'all'; filterType = 'all'; monthlyFilter = 'all';
          showToast('Filters reset', 'info');
          render();
        });

        // Add form
        document.getElementById('descInput')?.addEventListener('input', (e) => { description = e.target.value; });
        document.getElementById('amountInput')?.addEventListener('input', (e) => { amount = e.target.value; });
        document.getElementById('categorySelect')?.addEventListener('change', (e) => { category = e.target.value; });
        document.getElementById('typeToggle')?.addEventListener('click', (e) => {
          const btn = e.target.closest('.btn');
          if (!btn) return;
          entryType = btn.dataset.type;
          render();
        });
        document.getElementById('addBtn')?.addEventListener('click', addEntry);
        document.getElementById('descInput')?.addEventListener('keydown', (e) => { if(e.key==='Enter') addEntry(); });
        document.getElementById('amountInput')?.addEventListener('keydown', (e) => { if(e.key==='Enter') addEntry(); });

        // Edit panel
        if (editingId) {
          document.getElementById('editDesc')?.addEventListener('input', (e) => { editDesc = e.target.value; });
          document.getElementById('editAmount')?.addEventListener('input', (e) => { editAmount = e.target.value; });
          document.getElementById('editTypeSelect')?.addEventListener('change', (e) => { editType = e.target.value; render(); });
          document.getElementById('editCategorySelect')?.addEventListener('change', (e) => { editCategory = e.target.value; });
          document.getElementById('saveEditBtn')?.addEventListener('click', saveEdit);
          document.getElementById('cancelEditBtn')?.addEventListener('click', () => { editingId = null; render(); });
        }

        // List actions (delete/edit)
        document.getElementById('expenseList')?.addEventListener('click', (e) => {
          const target = e.target.closest('[data-action]');
          if (!target) return;
          const id = parseFloat(target.dataset.id);
          if (target.dataset.action === 'delete') {
            if (confirm('Delete this entry?')) {
              expenses = expenses.filter(e => e.id !== id);
              saveExpenses();
              showToast('Entry removed', 'info');
              render();
            }
          } else if (target.dataset.action === 'edit') {
            const exp = expenses.find(e => e.id === id);
            if (exp) {
              editingId = exp.id;
              editDesc = exp.description;
              editAmount = Math.abs(exp.amount).toString();
              editCategory = exp.category === 'income' ? 'food' : exp.category;
              editType = exp.amount >= 0 ? 'income' : 'expense';
              render();
            }
          }
        });

        // PDF / Excel
        document.getElementById('pdfBtn')?.addEventListener('click', exportPDF);
        document.getElementById('excelBtn')?.addEventListener('click', exportExcel);

        // ----- charts (after render) -----
        renderCharts();
        renderToasts();

        // re-run charts on resize
        setTimeout(renderCharts, 100);
      }

      // ---------- charts ----------
      function renderCharts() {
        // donut
        const donutCtx = document.getElementById('donutChart');
        if (donutCtx) {
          if (donutChart) { donutChart.destroy(); donutChart = null; }
          const catMap = {};
          expenses.forEach(exp => {
            if (exp.amount < 0) {
              const cat = exp.category || 'other';
              catMap[cat] = (catMap[cat]||0) + Math.abs(exp.amount);
            }
          });
          const labels = Object.keys(catMap);
          const data = Object.values(catMap);
          const colors = labels.map(c => categoryColors[c] || '#6b7280');
          if (data.length === 0) {
            donutChart = new Chart(donutCtx, {
              type: 'doughnut',
              data: { labels: ['No expenses'], datasets: [{ data: [1], backgroundColor: ['#e5e7eb'] }] },
              options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
            });
          } else {
            donutChart = new Chart(donutCtx, {
              type: 'doughnut',
              data: { labels: labels.map(l=>l.charAt(0).toUpperCase()+l.slice(1)), datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: darkMode ? '#1e2638' : '#fff' }] },
              options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position:'bottom', labels: { boxWidth:10, padding:6, font:{size:9}, color: darkMode ? '#c8d6e5' : '#1f2a36' } } }, cutout:'65%' }
            });
          }
        }

        // bar
        const barCtx = document.getElementById('barChart');
        if (barCtx) {
          if (barChart) { barChart.destroy(); barChart = null; }
          let income=0, expense=0;
          expenses.forEach(e => { if(e.amount>0) income+=e.amount; else if(e.amount<0) expense+=Math.abs(e.amount); });
          const textColor = darkMode ? '#c8d6e5' : '#1f2a36';
          barChart = new Chart(barCtx, {
            type: 'bar',
            data: { labels: ['Income', 'Expenses'], datasets: [{ label: 'Amount ($)', data: [income, expense], backgroundColor: ['#22c55e', '#ef4444'], borderRadius: 6, borderSkipped: false }] },
            options: {
              responsive: true, maintainAspectRatio: true,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }, ticks: { color: textColor } },
                x: { grid: { display: false }, ticks: { color: textColor } }
              }
            }
          });
        }
      }

      // ---------- actions ----------
      function addEntry() {
        const desc = description.trim();
        const amt = parseFloat(amount);
        if (!desc) { showToast('Please enter a description', 'error'); return; }
        if (!amount || isNaN(amt) || amt <= 0) { showToast('Enter a positive amount', 'error'); return; }
        const signedAmount = entryType === 'income' ? amt : -amt;
        const finalCategory = entryType === 'income' ? 'income' : category;
        expenses.unshift({ id: Date.now() + Math.random(), description: desc, amount: signedAmount, category: finalCategory, createdAt: new Date().toISOString() });
        saveExpenses();
        description = ''; amount = '';
        showToast(`${entryType === 'income' ? 'Income' : 'Expense'} added!`, 'success');
        render();
        document.getElementById('descInput')?.focus();
      }

      function saveEdit() {
        const desc = editDesc.trim();
        const amt = parseFloat(editAmount);
        if (!desc) { showToast('Description required', 'error'); return; }
        if (!editAmount || isNaN(amt) || amt <= 0) { showToast('Enter positive amount', 'error'); return; }
        expenses = expenses.map(e => {
          if (e.id === editingId) {
            const signed = editType === 'income' ? amt : -amt;
            const cat = editType === 'income' ? 'income' : editCategory;
            return { ...e, description: desc, amount: signed, category: cat };
          }
          return e;
        });
        saveExpenses();
        editingId = null;
        showToast('Entry updated', 'success');
        render();
      }

      // ---------- reports ----------
      function exportPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text('Expense Report', 20, 20);
        let y = 30;
        const filtered = getFiltered();
        filtered.forEach(e => {
          const sign = e.amount < 0 ? '-' : '+';
          doc.text(`${e.description}  ${sign}$${Math.abs(e.amount).toFixed(2)}  (${e.category})`, 20, y);
          y += 8;
          if (y > 270) { doc.addPage(); y = 20; }
        });
        doc.save('expense_report.pdf');
        showToast('PDF downloaded', 'success');
      }

      function exportExcel() {
        const filtered = getFiltered();
        const data = filtered.map(e => ({
          Description: e.description,
          Amount: e.amount,
          Category: e.category,
          Date: e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '-'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
        XLSX.writeFile(wb, 'expense_report.xlsx');
        showToast('Excel downloaded', 'success');
      }

      // ---------- init ----------
      document.addEventListener('DOMContentLoaded', () => {
        loadExpenses();
        if (darkMode) document.body.classList.add('dark-mode');
        render();
      });

    })();
  
