let allProducts = [];

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

async function loadProducts() {
  try {
    const response = await fetch("/api/products-list");
    allProducts = await response.json();

    const productSelect = document.getElementById("productNameSelect");
    allProducts.forEach(product => {
      const option = document.createElement("option");
      option.value = product.name;
      option.textContent = product.name;
      productSelect.appendChild(option);
    });

    productSelect.addEventListener("change", () => {
      const selected = allProducts.find(p => p.name === productSelect.value);
      if (selected) {
        document.getElementById("brandInput").value = selected.brand;
        document.getElementById("categoryInput").value = selected.category;
        document.getElementById("costPriceInput").value = selected.defaultCostPrice;
        document.getElementById("sellingPriceInput").value = selected.defaultSellingPrice;
        document.getElementById("shelfLifeInput").value = selected.defaultShelfLife;
      } else {
        document.getElementById("brandInput").value = "";
        document.getElementById("categoryInput").value = "";
        document.getElementById("costPriceInput").value = "";
        document.getElementById("sellingPriceInput").value = "";
        document.getElementById("shelfLifeInput").value = "";
      }
    });
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
