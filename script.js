// URLs para las solicitudes JSON
var url = "UsoDatos.json";
var url1 = "SignalStats.json";
var url1a = "Radiobaseslte";
var url2 = "GetQueue.php";
var old_value;

// Función para obtener y mostrar datos
function GetData() {
    $.ajaxSetup({ timeout: 1500 }); // Timeout de 1.5 segundos

    // Solicitud para UsoDatos.json
    $.getJSON(url, function(data) {
        if (data.error) {
            $('#rest').html('Server Offline');
            return false;
        }
        $(".modal:nth-child(2) header span:nth-child(3)").removeClass("errcnxn");
        if (data.UltRegistro != old_value) {
            let htmld = "";
            Object.entries(data).forEach(([key, value]) => {
                htmld += '<b>' + key + ':</b> ' + value + '<br>';
            });
            $('#rest').html(htmld);
        }
        if (old_value == undefined) {
            old_value = data.UltRegistro;
        }
    }).catch(function() {
        $(".modal:nth-child(2) header span:nth-child(3)").addClass("errcnxn");
    });

    // Solicitud para SignalStats.json
    $.getJSON(url1, function(data1) {
        if (data1.error) {
            $('#rest2').html('Server Offline');
            return false;
        }
        $(".modal:nth-child(3) header span:nth-child(3)").removeClass("errcnxn");
        let content = "<table><tr><th>LTE</th><th>Estado Serv.</th><th>Señal</th><th>Vel. KBs</th></tr><tbody><tr>";
        
        if (data1.LTE == 1) data1.LTE = 'Si'; else data1.LTE = 'No';
        if (data1.inService == 1) data1.inService = 'OK';
        content += '<td>' + data1.LTE + '</td><td>' + data1.inService + '</td><td>' + data1.SignalStr + '</td><td>' + data1.SpeedKBs + '</td>';
        
        content += "</tr></tbody></table>";
        $('#rest2').html(content);
    }).catch(function() {
        $(".modal:nth-child(3) header span:nth-child(3)").addClass("errcnxn");
    });


    // Solicitud para Radiobaseslte
    $.get(url1a, function(data1a) {
        if (data1a.error) {
            $('#rest2a').html('Server Offline');
            return false;
        }
        $(".modal:nth-child(3) header span:nth-child(3)").removeClass("errcnxn");
        // Procesar los datos de las radiobases
        const inputStr = data1a; // Asume que los datos están en data1a.data

        const processedData = processData(inputStr);

        // Mostrar los datos en el contenedor #rest2a
        displayData(processedData);
    }).catch(function() {
        $(".modal:nth-child(3) header span:nth-child(3)").addClass("errcnxn");
    });

    // Solicitud para GetQueue.php
    $.getJSON(url2, function(data2) {
        if (data2.error) {
            $('#rest3').html('Server Offline');
            return false;
        }
        $(".modal:nth-child(4) header span:nth-child(3)").removeClass("errcnxn");
        data2.sort(function(a, b) {
            const aTotMB = a.UpDnMB.split("-").reduce((sum, val) => sum + parseInt(val), 0);
            const bTotMB = b.UpDnMB.split("-").reduce((sum, val) => sum + parseInt(val), 0);
            return bTotMB - aTotMB;
        });
        let content = "<table><tr><th>Nombre</th><th>Subido</th><th>Descarg.</th><th>TotalDia</th></tr><tbody>";
        data2.forEach(value => {
            const [UpMB, DnMB] = value.UpDnMB.split("-").map(Number);
            const totMB = UpMB + DnMB;
            content += `<tr><td>${value.Nombre}</td><td>${UpMB} MB</td><td>${DnMB} MB</td><td>${totMB} MB</td></tr>`;
        });
        content += "</tbody></table>";
        $('#rest3').html(content);
    }).catch(function() {
        $(".modal:nth-child(4) header span:nth-child(3)").addClass("errcnxn");
    });

    // Repetir la función cada 2 segundos
    setTimeout(GetData, 2000);
}

// Función para procesar la cadena de radiobases
function processData(input) {
    const parts = input.split(",");
    const timestamp = parts[0].trim();
    const lteCids = parts.slice(1).map(part => {
        const cleanedPart = part.trim().replace("LteCids=", "");
        const [id, dBmRaw] = cleanedPart.split(":");
        const dBm = `-${dBmRaw.replace("dbm", "dBm")}`;
        return { id, dBm };
    });
    return { timestamp, LteCids: lteCids };
}

// Función para convertir el timestamp al formato correcto
function parseCustomTimestamp(timestamp) {
    const [datePart, ...timeParts] = timestamp.split(" ");
    const timePart = timeParts.join(" ");

    const [day, month, year] = datePart.split("/");
    const fullYear = `20${year}`;

    const [time, period] = timePart.split(" ");
    const [hoursStr, minutes] = time.split(":");
    let hours = parseInt(hoursStr, 10);

    if (period === "PM" && hours !== 12) hours += 12;
    else if (period === "AM" && hours === 12) hours = 0;

    const isoDate = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hours.toString().padStart(2, "0")}:${minutes}:00`;
    return new Date(isoDate);
}

// Función para calcular el tiempo transcurrido
function calculateTimeElapsed(timestamp) {
    const date = parseCustomTimestamp(timestamp);
    if (isNaN(date.getTime())) return "Fecha no válida";

    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    return diffHours > 0
        ? `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`
        : `Hace ${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""}`;
}

// Función para mostrar los datos de las radiobases
function displayData(data) {
    const container = document.getElementById("rest2a");
    container.innerHTML = ""; // Limpiar contenedor

    // Encabezado
    const header = document.createElement("h3");
    header.textContent = "Celdas Lte disponibles";
    container.appendChild(header);

    // Crear tabla
    const table = document.createElement("table");
    table.style.width = "140px"; // Ancho fijo y pequeño

    // Crear encabezado de la tabla
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const headerCell1 = document.createElement("th");
    headerCell1.textContent = "CellId";
    headerRow.appendChild(headerCell1);

    const headerCell2 = document.createElement("th");
    headerCell2.textContent = "dBm";
    headerRow.appendChild(headerCell2);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Crear cuerpo de la tabla
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
	
    // Tiempo transcurrido
    const timeElapsed = calculateTimeElapsed(data.timestamp);
    const timeElement = document.createElement("p");
    timeElement.textContent = `Último cambio: ${timeElapsed}`;
    container.appendChild(timeElement);
}

// Iniciar la obtención de datos
GetData();

function GetCellInfo() {
	$.ajaxSetup({
		timeout: 1500 //Time in milliseconds
	});
	$.getJSON( "GetCellInfo.php", function( data ) {
		
		var content = "<table><tr><th>UsoCPU</th><th>RAMLibre</th><th>RAMOcupada</th><th>UpTime</th></tr><tbody>"

		content += '<tr><td>' + data['Uso CPU'] + '</td><td>' + data['RAM libre'] + '</td><td>' + data['RAM Ocupada'] + '</td><td>' + data['UpTime'] + '</td></tr>';

		content += "</tbody></table>"
		
		
	  $( "#Cellnfo" ).html( content );
	  
	});
	setTimeout(function() {
		GetCellInfo();
	}, 3000)
}


GetCellInfo();
var timeoutId
$(document).on('click', '#h_o-l', function() {
    $(this).parent()
        .toggleClass('toggled-on')
        .toggleClass('toggled-off');
	clearTimeout(timeoutId);
	timeoutId = setTimeout(function() {
		$('.opt ')
			.removeClass('toggled-off')
			.removeClass('toggled-on')
			.addClass('toggled-off');
		$("#optc").delay(300).hide(0);
	}, 5000)
	
	if ($(this).parent().hasClass("toggled-off")) {
		$("#optc").delay(300).hide(0);
	}
	else{
		$("#optc").show(0);
	}

});

var timeoutId1
$(document).on('click', '#h_o-l2', function() {
    $(this).parent()
        .toggleClass('toggled-on')
        .toggleClass('toggled-off');
	clearTimeout(timeoutId1);
	timeoutId1 = setTimeout(function() {
		$('.opt ')
			.removeClass('toggled-off')
			.removeClass('toggled-on')
			.addClass('toggled-off');
		$("#optc2").delay(300).hide(0);
	}, 5000)
	
	if ($(this).parent().hasClass("toggled-off")) {
		$("#optc2").delay(300).hide(0);
	}
	else{
		$("#optc2").show(0);
	}

});

$(document).on('click', '#RstAdb', function() {
	$.get( "resetadb.php", function( data ) {
		
	})
});
$(document).on('click', '#Reboot', function() {
	$.get( "reboot.php", function( data ) {
		
	})
});
$(document).on('click', '#ResetNet', function() {
	$.get( "resetnetw.php", function( data ) {
		
	})
});

$(document).on('click', '#phpfilem', function() {
	window.location.href = "phpfilemanager/index.php"
});
$(document).on('click', '#vncv', function() {
	window.location = 'http://' + window.location.hostname + ":5801/novnc/vnc_auto.html?host=192.168.43.1&port=5901&true_color=1"
});
$(document).on('click', '#speedt', function() {
	window.location.href = "speedtest/example-singleServer-chart.html"
});

$("#optc").hide(0);
$("#optc2").hide(0);