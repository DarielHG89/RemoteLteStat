(function($) {
  // URLs for JSON requests
  var url = "UsoDatos.json"; // Data usage information
  var url1 = "SignalStats.json"; // Network signal statistics
  var url1a = "Radiobaseslte"; // LTE cell information (plain text)
  var url2 = "GetQueue.php"; // User consumption queue

  // Stores the 'UltRegistro' (last registration) timestamp from UsoDatos.json
  // to prevent unnecessary DOM updates if the data hasn't changed.
  var old_value;

  // Main function to fetch and display data from various sources.
  // This function calls itself recursively via setTimeout for periodic updates.
  function GetData() {
    // Request for UsoDatos.json
    $.getJSON(url, function(data) {
      if (data.error) {
        $('#rest').html('Server Offline');
        return false;
      }
      // Use specific modal ID for clarity when removing error class
      $("#data-status-modal header span:nth-child(3)").removeClass("errcnxn");
      if (data.UltRegistro !== old_value) { // Use strict inequality
        let htmld = "";
        Object.entries(data).forEach(([key, value]) => {
          htmld += `<b>${key}:</b> ${value}<br>`;
        });
        $('#rest').html(htmld);
      }
      if (old_value === undefined) { // Use strict equality for initial check
        old_value = data.UltRegistro;
      }
    }).fail(function() {
      // Use specific modal ID for clarity when adding error class
      $("#data-status-modal header span:nth-child(3)").addClass("errcnxn");
    }, { timeout: 1500 });

    // Request for SignalStats.json
    $.getJSON(url1, function(data1) {
      if (data1.error) {
        $('#rest2').html('Server Offline');
        return false;
      }
      // Use specific modal ID for clarity
      $("#network-status-modal header span:nth-child(3)").removeClass("errcnxn");
      const lteStatus = data1.LTE == 1 ? 'Si' : 'No';
      const inServiceStatus = data1.inService == 1 ? 'OK' : data1.inService; // Keep original value if not 1
      let content = `
                <table>
                  <tr><th>LTE</th><th>Estado Serv.</th><th>Señal</th><th>Vel. KBs</th></tr>
                  <tbody>
                    <tr>
                      <td>${lteStatus}</td>
                      <td>${inServiceStatus}</td>
                      <td>${data1.SignalStr}</td>
                      <td>${data1.SpeedKBs}</td>
                    </tr>
                  </tbody>
                </table>`;
      $('#rest2').html(content);
    }).fail(function() {
      $("#network-status-modal header span:nth-child(3)").addClass("errcnxn");
    }, { timeout: 1500 });

    // Request for Radiobaseslte (plain text)
    $.get(url1a, function(data1a) {
      // Assuming 'error' would be part of the text response if it occurs,
      // or an HTTP error would trigger .fail()
      if (typeof data1a === 'string' && data1a.includes("error")) { // Basic error check for text response
        $('#rest2a').html('Server Offline');
        return false;
      }
      $("#network-status-modal header span:nth-child(3)").removeClass("errcnxn");
      const processedData = processData(data1a); // data1a is the plain text
      displayData(processedData);
    }).fail(function() {
      $("#network-status-modal header span:nth-child(3)").addClass("errcnxn");
    }, { timeout: 1500 });

    // Request for GetQueue.php
    $.getJSON(url2, function(data2) {
      if (data2.error) {
        $('#rest3').html('Server Offline');
        return false;
      }
      // Use specific modal ID for clarity
      $("#user-consumption-modal header span:nth-child(3)").removeClass("errcnxn");
      data2.sort(function(a, b) {
        // Calculate total MB for sorting, ensure parseInt has radix
        const aTotMB = a.UpDnMB.split("-").reduce((sum, val) => sum + parseInt(val, 10), 0);
        const bTotMB = b.UpDnMB.split("-").reduce((sum, val) => sum + parseInt(val, 10), 0);
        return bTotMB - aTotMB; // Sort descending by total MB
      });
      let tableRows = "";
      data2.forEach(value => {
        const [UpMB, DnMB] = value.UpDnMB.split("-").map(Number);
        const totMB = UpMB + DnMB;
        tableRows += `<tr><td>${value.Nombre}</td><td>${UpMB} MB</td><td>${DnMB} MB</td><td>${totMB} MB</td></tr>`;
      });
      const content = `
                <table>
                  <tr><th>Nombre</th><th>Subido</th><th>Descarg.</th><th>TotalDia</th></tr>
                  <tbody>
                    ${tableRows}
                  </tbody>
                </table>`;
      $('#rest3').html(content);
    }).fail(function() {
      $("#user-consumption-modal header span:nth-child(3)").addClass("errcnxn");
    }, { timeout: 1500 });

    // Repeat the GetData function every 2 seconds
    setTimeout(GetData, 2000);
  }

  // Parses the plain text string from 'Radiobaseslte' endpoint.
  // Example input: "14/07/23 08:30 PM,LteCids=123:45dbm,LteCids=456:78dbm"
  function processData(input) {
    const parts = input.split(",");
    const timestamp = parts[0].trim();
    const lteCids = parts.slice(1).map(part => {
      const cleanedPart = part.trim().replace("LteCids=", "");
      const [id, dBmRaw] = cleanedPart.split(":");
      const dBm = `-${dBmRaw.replace("dbm", "dBm")}`; // Standardizes to "-XdBm"
      return { id, dBm };
    });
    return { timestamp, LteCids: lteCids };
  }

  // Parses a custom timestamp string into a JavaScript Date object.
  // Expected format: "DD/MM/YY HH:MM AM/PM" (e.g., "14/07/23 08:30 PM")
  function parseCustomTimestamp(timestamp) {
    // Regex to capture date and time parts, case-insensitive for AM/PM
    const parts = timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})\s(\d{1,2}):(\d{2})\s(AM|PM)/i);
    if (!parts) {
      console.error("Invalid timestamp format:", timestamp);
      return new Date(NaN); // Return an invalid date if format doesn't match
    }

    let [, day, month, year, hours, minutes, period] = parts;
    year = `20${year}`; // Assuming years are in the 21st century (e.g., 23 -> 2023)
    hours = parseInt(hours, 10); // Specify radix 10
    minutes = parseInt(minutes, 10); // Specify radix 10
    day = parseInt(day, 10); // Specify radix 10
    month = parseInt(month, 10); // Specify radix 10

    if (period.toUpperCase() === "PM" && hours !== 12) {
      hours += 12;
    } else if (period.toUpperCase() === "AM" && hours === 12) { // Handle midnight case (12 AM is 00 hours)
      hours = 0;
    }

    // Note: JavaScript Date month is 0-indexed (0 for January, 11 for December)
    return new Date(year, month - 1, day, hours, minutes);
  }

  // Calculates and returns a human-readable string for time elapsed since the given timestamp.
  function calculateTimeElapsed(timestamp) {
    const date = parseCustomTimestamp(timestamp);
    if (isNaN(date.getTime())) {
      return "Fecha no válida"; // Return if parseCustomTimestamp indicated an invalid date
    }

    const now = new Date();
    const diffMs = now - date; // Difference in milliseconds
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
    } else if (diffHours > 0) {
      return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    } else if (diffMinutes > 0) {
      return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""}`;
    } else {
      // Handle "0 seconds" or "1 second" or "X seconds"
      return `Hace ${diffSeconds} segundo${diffSeconds !== 1 ? "s" : ""}`;
    }
  }

  // Displays processed data (from 'Radiobaseslte' - cell information) in the '#rest2a' container.
  function displayData(data) {
    const container = document.getElementById("rest2a");
    container.innerHTML = ""; // Clear previous content

    const header = document.createElement("h3");
    header.textContent = "Celdas Lte disponibles";
    container.appendChild(header);

    const table = document.createElement("table");
    table.style.width = "140px"; // Set a fixed small width

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["CellId", "dBm"].forEach(text => { // Create header cells dynamically
      const th = document.createElement("th");
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    data.LteCids.forEach(cell => {
      const row = document.createElement("tr");
      const cellIdCell = document.createElement("td");
      cellIdCell.textContent = cell.id;
      row.appendChild(cellIdCell);
      const dBmCell = document.createElement("td");
      dBmCell.textContent = cell.dBm;
      row.appendChild(dBmCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    const timeElapsed = calculateTimeElapsed(data.timestamp);
    const timeElement = document.createElement("p");
    timeElement.textContent = `Último cambio: ${timeElapsed}`;
    container.appendChild(timeElement);
  }

  // Fetches and displays cell information (CPU, RAM, Uptime) in '#Cellnfo'.
  // This function also calls itself recursively via setTimeout for periodic updates.
  function GetCellInfo() {
    $.getJSON("GetCellInfo.php", function(data) {
      const content = `
                <table>
                  <tr><th>UsoCPU</th><th>RAMLibre</th><th>RAMOcupada</th><th>UpTime</th></tr>
                  <tbody>
                    <tr>
                      <td>${data['Uso CPU']}</td>
                      <td>${data['RAM libre']}</td>
                      <td>${data['RAM Ocupada']}</td>
                      <td>${data['UpTime']}</td>
                    </tr>
                  </tbody>
                </table>`;
      $("#Cellnfo").html(content);
    }, { timeout: 1500 }); // Individual timeout for this request

    setTimeout(GetCellInfo, 3000); // Update every 3 seconds
  }

  // Initial calls to start data fetching loops
  GetData();
  GetCellInfo();

  var timeoutId1; // For #optc2 menu

  // Click handler for the first options toggle button (#h_o-l).
  // Toggles visibility of the '#optc' menu.
  // Sets a timeout to automatically hide the menu after 5 seconds of inactivity.
  $(document).on('click', '#h_o-l', function() {
    var $parentOpt = $(this).parent(); // Cache the parent .opt element for efficiency
    $parentOpt.toggleClass('toggled-on toggled-off');
    clearTimeout(timeoutId); // Clear any existing timeout for this menu

    if ($parentOpt.hasClass("toggled-on")) {
      $("#optc").show(0); // Show immediately (no animation delay)
      // Set a new timeout to hide the menu
      timeoutId = setTimeout(function() {
        $parentOpt.removeClass('toggled-on').addClass('toggled-off');
        $("#optc").delay(300).hide(0); // Hide after a 300ms delay (allows for CSS transition)
      }, 5000); // Auto-hide after 5 seconds
    } else {
      // If toggled off manually, hide it after the CSS transition
      $("#optc").delay(300).hide(0);
    }
  });

  // Click handler for the second options toggle button (#h_o-l2).
  // Toggles visibility of the '#optc2' menu.
  // Similar logic to the #h_o-l handler.
  $(document).on('click', '#h_o-l2', function() {
    var $parentOpt = $(this).parent(); // Cache the parent .opt element
    $parentOpt.toggleClass('toggled-on toggled-off');
    clearTimeout(timeoutId1); // Clear any existing timeout for this specific menu

    if ($parentOpt.hasClass("toggled-on")) {
      $("#optc2").show(0); // Show immediately
      timeoutId1 = setTimeout(function() {
        $parentOpt.removeClass('toggled-on').addClass('toggled-off');
        $("#optc2").delay(300).hide(0);
      }, 5000);
    } else {
      $("#optc2").delay(300).hide(0);
    }
  });

  // Click handlers for various action buttons that trigger PHP scripts via GET requests.
  $(document).on('click', '#RstAdb', function() {
    $.get("resetadb.php", function(data) {
      console.log("RstAdb success:", data); // Log success response
    }).fail(function(jqXHR, textStatus, errorThrown) {
      console.error("RstAdb failed:", textStatus, errorThrown); // Log error
    }, { timeout: 1500 });
  });

  $(document).on('click', '#Reboot', function() {
    $.get("reboot.php", function(data) {
      console.log("Reboot success:", data);
    }).fail(function(jqXHR, textStatus, errorThrown) {
      console.error("Reboot failed:", textStatus, errorThrown);
    }, { timeout: 1500 });
  });

  $(document).on('click', '#ResetNet', function() {
    $.get("resetnetw.php", function(data) {
      console.log("ResetNet success:", data);
    }).fail(function(jqXHR, textStatus, errorThrown) {
      console.error("ResetNet failed:", textStatus, errorThrown);
    }, { timeout: 1500 });
  });

  // Navigation handlers that change the window location.
  $(document).on('click', '#phpfilem', function() {
    window.location.href = "phpfilemanager/index.php";
  });

  $(document).on('click', '#vncv', function() {
    // Construct VNC URL using the current hostname.
    // The VNC target host and port seem to be fixed at 192.168.43.1:5901.
    window.location.href = `http://${window.location.hostname}:5801/novnc/vnc_auto.html?host=192.168.43.1&port=5901&true_color=1`;
  });

  $(document).on('click', '#speedt', function() {
    window.location.href = "speedtest/example-singleServer-chart.html";
  });

  // Initially hide the option content divs when the page loads.
  // Their visibility is controlled by the toggle buttons (#h_o-l and #h_o-l2).
  $("#optc").hide(0);
  $("#optc2").hide(0);

})(jQuery); // Pass jQuery to the IIFE to ensure $ is an alias for jQuery and to avoid global scope pollution.