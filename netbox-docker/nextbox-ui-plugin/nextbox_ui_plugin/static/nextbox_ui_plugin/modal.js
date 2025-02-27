

function decodeSanitizedString(sanitizedStr) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedStr, 'text/html');
    return doc.documentElement.textContent;
}

function showModal(titleConfig, tableData) {
    hideModal();
    const container = document.getElementById('topology-container');

    if (!container) {
        console.error("Container not found!");
        return;
    }

    // Detect if dark mode is preferred
    const isDarkMode = detectNBColorMode() == 'dark';

    // Define light and dark mode colors
    const modalBackgroundColor = isDarkMode ? 'rgba(32, 32, 32, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    const textColor = isDarkMode ? '#f0f0f0' : '#333';
    const borderColor = isDarkMode ? '#555' : '#ddd';

    // Create the modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'modalOverlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '1000';

    // Create the modal container
    const modal = document.createElement('div');
    modal.id = 'modalWindow';
    modal.style.width = '500px';
    modal.style.padding = '20px';
    modal.style.backgroundColor = modalBackgroundColor;
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    modal.style.textAlign = 'center';
    modal.style.color = textColor;
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '10px';

    // Create the header element based on titleConfig
    const title = document.createElement('h5');
    const link = document.createElement('a');
    if (titleConfig.href) {
        link.href = titleConfig.href;
        link.style.textDecoration = 'underline';
    }
    link.textContent = titleConfig.text;
    link.target = '_blank';
    title.style.fontSize = '24px';
    title.style.fontWeight = 'bold';
    title.style.color = textColor;
    title.style.textShadow = `-1px -1px 0 ${borderColor}, 1px -1px 0 ${borderColor}, -1px 1px 0 ${borderColor}, 1px 1px 0 ${borderColor}`;
    title.appendChild(link);

    // Create a nested table based on tableData
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.marginTop = '10px';
    table.style.borderCollapse = 'collapse';

    table.innerHTML = tableData.map(rowData =>
        `<tr>${rowData.map(cellData =>
            `<td style="border: 1px solid ${borderColor}; padding: 8px; color: ${textColor};">${cellData}</td>`
        ).join('')}</tr>`
    ).join('');

    // Construct the resulting modal window
    modal.appendChild(title);
    modal.appendChild(table);
    overlay.appendChild(modal);
    container.appendChild(overlay);

    // Close the modal when clicking outside it
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            hideModal();
        }
    });
}

function hideModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.parentElement.removeChild(overlay);
    }
}

function nodeClickHandler(event) {
    const { nodeId, nodeData, click } = event.detail;
    // Render Node modal window on right mouse button click only
    if (click.button !== 2) return;

    const titleConfig = {
        text: nodeData?.customAttributes?.name,
        href: decodeSanitizedString(nodeData?.customAttributes?.dcimDeviceLink),
    }

    // Create the Alert Link by replacing 'replace_to_name' with the actual device name
    const alertLink = window.alertsDeviceBaseURL
        ? window.alertsDeviceBaseURL.replace('replace_to_name', nodeData?.customAttributes?.name)
        : '–';

    const tableContent = [
        ['Model', nodeData?.customAttributes?.model || '–'],
        ['Serial Number', nodeData?.customAttributes?.serialNumber || '–'],
        ['Role', nodeData?.customAttributes?.deviceRole || '–'],
        ['Primary IP', nodeData?.customAttributes?.primaryIP || '–'],
        ['Alert Link', alertLink !== '–'
            ? `<a href="${alertLink}" target="_blank">View Alerts</a>`
            : '–'
        ]
    ];

    showModal(titleConfig, tableContent);
}


function edgeClickHandler(event) {
    const { edgeId, edgeData, click } = event.detail;
    if (click.button !== 2) return;

    let linkName = edgeData?.customAttributes?.name || 'Unknown';
    let linkHref = decodeSanitizedString(edgeData?.customAttributes?.dcimCableURL || '');

    if (edgeData.isBundled) {
        linkName = 'LAG';
        linkHref = '';
    }

    const titleConfig = {
        text: linkName,
        href: linkHref,
    };

    const sourceBwURL = window.interfaceBwBaseURL
        ? window.interfaceBwBaseURL
            .replace("device_name", edgeData?.customAttributes?.source || 'unknown_device')
            .replace("interface_name", edgeData?.sourceInterface || 'unknown_interface')
        : '–';

    const targetBwURL = window.interfaceBwBaseURL
        ? window.interfaceBwBaseURL
            .replace("device_name", edgeData?.customAttributes?.target || 'unknown_device')
            .replace("interface_name", edgeData?.targetInterface || 'unknown_interface')
        : '–';

    const minAvgMaxURL = `${window.nbEnpointsURL}/?endpoint=ifdata&device=${edgeData?.customAttributes?.source}&interface=${edgeData?.sourceInterface}`;

    // Initially, only the Fetch Data button appears
    const tableContent = [
        ['Source', edgeData?.customAttributes?.source || '–'],
        ['Target', edgeData?.customAttributes?.target || '–'],
        ['Link Utilization',
            (sourceBwURL !== '–' ? `<a href="${sourceBwURL}" target="_blank">Source</a>` : '–') +
            ' | ' +
            (targetBwURL !== '–' ? `<a href="${targetBwURL}" target="_blank">Target</a>` : '–')
        ],
        ['<button id="fetchMinAvgMax" style="padding: 5px 10px; cursor: pointer;">Fetch Data</button>', '<span id="minAvgMaxResult"></span>'], // Separate columns
    ];

    showModal(titleConfig, tableContent);

    // Add event listener to fetch Min/Avg/Max data
    setTimeout(() => {
        const fetchButton = document.getElementById("fetchMinAvgMax");
        const resultSpan = document.getElementById("minAvgMaxResult");

        if (fetchButton && resultSpan) {
            fetchButton.addEventListener("click", async () => {
                fetchButton.textContent = "Loading...";
                try {
                    const response = await fetch(minAvgMaxURL);
                    const data = await response.json();
                    if (data) {
                        const resultText = `Min: ${data.min} | Avg: ${data.avg} | Max: ${data.max}`;
                        fetchButton.outerHTML = `<button id="toggleMinAvgMax" style="padding: 5px 10px; cursor: pointer;">Min/Avg/Max</button>`;
                        resultSpan.innerHTML = resultText;
                        resultSpan.style.display = "none"; // Hidden initially

                        // Add event listener for toggling result visibility
                        setTimeout(() => {
                            const toggleBtn = document.getElementById("toggleMinAvgMax");
                            if (toggleBtn) {
                                toggleBtn.addEventListener("click", () => {
                                    resultSpan.style.display = resultSpan.style.display === "none" ? "inline" : "none";
                                });
                            }
                        }, 0);
                    } else {
                        resultSpan.innerHTML = "Data unavailable";
                    }
                } catch (error) {
                    resultSpan.innerHTML = "Error fetching data";
                    console.error("Error fetching Min/Avg/Max data:", error);
                }
            });
        }
    }, 0);
}


window.addEventListener('topoSphere.nodeClicked', (event) => {
    event.preventDefault();
    nodeClickHandler(event);
});

window.addEventListener('topoSphere.nodeDoubleTapped', (event) => {
    event.preventDefault();
    nodeClickHandler(event);
});

window.addEventListener('topoSphere.edgeClicked', (event) => {
    event.preventDefault();
    edgeClickHandler(event);
});

window.addEventListener('topoSphere.edgeDoubleTapped', (event) => {
    event.preventDefault();
    edgeClickHandler(event);
});

// Additionally, suppress right-click menu globally for the topology container
document.getElementById('topology-container').addEventListener('contextmenu', (event) => {
    event.preventDefault();  // Disable context menu in the topology container
});
