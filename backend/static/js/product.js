let allProducts = [];
let selected = { product: "", brand: "", category: "" };

async function loadCountries() {
  try {
    const response = await fetch("https://countriesnow.space/api/v0.1/countries/states");
    const data = await response.json();
    const countries = data.data;
    const countrySelect = document.getElementById("countrySelect");

    countries.forEach(c => {
      const option = document.createElement("option");
      option.value = c.name;
      option.textContent = c.name;
      countrySelect.appendChild(option);
    });

    countrySelect.addEventListener("change", () => {
      const selectedCountry = countries.find(c => c.name === countrySelect.value);
      const stateSelect = document.getElementById("stateSelect");
      const citySelect = document.getElementById("citySelect");

      stateSelect.innerHTML = '<option value="">Select State</option>';
      citySelect.innerHTML = '<option value="">Select City</option>';
      citySelect.disabled = true;

      if (selectedCountry) {
        selectedCountry.states.forEach(s => {
          const option = document.createElement("option");
          option.value = s.name;
          option.textContent = s.name;
          stateSelect.appendChild(option);
        });
        stateSelect.disabled = false;
      } else {
        stateSelect.disabled = true;
      }
    });
  } catch (err) {
    console.error("Failed to load countries:", err);
  }
}

async function loadCitiesOnStateSelect() {
  const stateSelect = document.getElementById("stateSelect");
  const countrySelect = document.getElementById("countrySelect");
  const citySelect = document.getElementById("citySelect");

  stateSelect.addEventListener("change", async () => {
    citySelect.innerHTML = '<option value="">Loading...</option>';
    citySelect.disabled = true;

    try {
      const response = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: countrySelect.value,
          state: stateSelect.value
        })
      });

      const data = await response.json();
      citySelect.innerHTML = '<option value="">Select City</option>';
      data.data.forEach(city => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
      });
      citySelect.disabled = false;
    } catch (err) {
      console.error("Failed to load cities:", err);
    }
  });
}

function rebuildDropdown(selectElement, items, currentValue) {
  selectElement.innerHTML = `<option value="">Select ${selectElement.name}</option>`;
  [...new Set(items)].sort().forEach(val => {
    const option = document.createElement("option");
    option.value = val;
    option.textContent = val;
    if (val === currentValue) option.selected = true;
    selectElement.appendChild(option);
  });
}

function filterData() {
  return allProducts.filter(p => {
    return (!selected.product || p.product_name === selected.product) &&
           (!selected.brand || p.brand === selected.brand) &&
           (!selected.category || p.category === selected.category);
  });
}

function updateFormFieldsFromProduct(productName) {
  const selectedProduct = allProducts.find(p => p.product_name === productName);
  if (selectedProduct) {
    document.getElementById("brandInput").value = selectedProduct.brand;
    document.getElementById("categoryInput").value = selectedProduct.category;
    document.getElementById("costPriceInput").value = selectedProduct.cost_price;
    document.getElementById("sellingPriceInput").value = selectedProduct.selling_price;
    document.getElementById("shelfLifeInput").value = selectedProduct.shelf_life;
  } else {
    document.getElementById("brandInput").value = "";
    document.getElementById("categoryInput").value = "";
    document.getElementById("costPriceInput").value = "";
    document.getElementById("sellingPriceInput").value = "";
    document.getElementById("shelfLifeInput").value = "";
  }
}

function applySmartFilters() {
  const filtered = filterData();
  const productSelect = document.getElementById("productNameSelect");
  const brandSelect = document.getElementById("brandSelect");
  const categorySelect = document.getElementById("categorySelect");

  const validProducts = filtered.map(p => p.product_name);
  const validBrands = filtered.map(p => p.brand);
  const validCategories = filtered.map(p => p.category);

  rebuildDropdown(productSelect, validProducts, selected.product);
  rebuildDropdown(brandSelect, validBrands, selected.brand);
  rebuildDropdown(categorySelect, validCategories, selected.category);
}

async function loadProducts() {
  try {
    const response = await fetch("/api/products-list");
    const raw = await response.json();

    allProducts = raw.map(p => ({
      product_name: p.name,
      brand: p.brand,
      category: p.category,
      cost_price: p.defaultCostPrice,
      selling_price: p.defaultSellingPrice,
      shelf_life: p.defaultShelfLife
    }));

    document.getElementById("productNameSelect").addEventListener("change", (e) => {
      selected.product = e.target.value;
      const match = allProducts.find(p => p.product_name === selected.product);
      if (match) {
        selected.brand = match.brand;
        selected.category = match.category;
      }
      applySmartFilters();
      updateFormFieldsFromProduct(selected.product);
    });

    document.getElementById("brandSelect").addEventListener("change", (e) => {
      selected.brand = e.target.value;
      selected.product = "";
      applySmartFilters();
      updateFormFieldsFromProduct("");
    });

    document.getElementById("categorySelect").addEventListener("change", (e) => {
      selected.category = e.target.value;
      selected.product = "";
      applySmartFilters();
      updateFormFieldsFromProduct("");
    });

    applySmartFilters();
  } catch (err) {
    console.error("Failed to load product list:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadCountries();
  loadCitiesOnStateSelect();
  loadProducts();
});

const form = document.getElementById('productForm');
const submitBtn = document.getElementById('submitBtn');
const spinner = document.getElementById('spinner');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  spinner.classList.remove('hidden');
  submitBtn.disabled = true;

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch(`${window.location.origin}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showMessage('Product registered successfully!');
      form.reset();
      selected = { product: "", brand: "", category: "" };
      applySmartFilters();
      document.getElementById("stateSelect").innerHTML = '<option value="">Select State</option>';
      document.getElementById("citySelect").innerHTML = '<option value="">Select City</option>';
      document.getElementById("stateSelect").disabled = true;
      document.getElementById("citySelect").disabled = true;
    } else {
      showMessage('Failed to register product.', false);
    }
  } catch (err) {
    console.error(err);
    showMessage('An error occurred. Please try again.', false);
  } finally {
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
});

function showMessage(message, isSuccess = true) {
  let existing = document.getElementById("formAlert");
  if (existing) existing.remove();

  const alertDiv = document.createElement("div");
  alertDiv.id = "formAlert";
  alertDiv.className = `alert ${isSuccess ? "alert-success" : "alert-error"}`;
  alertDiv.textContent = message;

  form.appendChild(alertDiv);

  setTimeout(() => alertDiv.remove(), 4000);
}
