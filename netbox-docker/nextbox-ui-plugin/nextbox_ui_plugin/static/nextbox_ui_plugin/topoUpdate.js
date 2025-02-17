class NodeStatusPoller {
    constructor(nbEnpointsURL, pollInterval) {
        this.nbEnpointsURL = nbEnpointsURL;
        this.pollInterval = pollInterval;
        this.isPolling = false;
        this.pollTimer = null;
    }

    // Start polling
    start() {
        if (this.isPolling) return;

        this.isPolling = true;
        this.poll();
    }

    // Stop polling
    stop() {
        this.isPolling = false;
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
    }

    // Get topology Nodes and return a map of { "device_name": node_object }
    getNodes() {
        if (!window.topoSphere?.topology?.nodes) {
            console.error('Nodes are not available');
            return new Map();
        }
        return new Map(window.topoSphere.topology.nodes.map(node => [node.customAttributes.name, node]));
    }

    // Get topology Edges
    getEdges() {
        if (!window.topoSphere?.topology?.edges) {
            console.error('Edges are not available');
            return [];
        }
        return window.topoSphere.topology.edges;
    }

    // Fetch status for nodes from multiple endpoints
    async fetchNodesData(topologyNodes) {
        try {
            let result = {};
            const filterValue = Array.from(topologyNodes.keys()).join(","); // Convert map keys to a comma-separated string
    
            // Define API endpoints
            const endpoints = {
                alertsData: `${this.nbEnpointsURL}/?endpoint=alerts&filter=${filterValue}`,
                bwData: `${this.nbEnpointsURL}/?endpoint=bw&filter=${filterValue}`,
            };
    
            // Fetch all endpoints in parallel
            const responses = await Promise.allSettled(
                Object.entries(endpoints).map(([key, url]) => fetch(url).then(res => ({ key, res })))
            );
    
            // Process responses
            for (const response of responses) {
                if (response.status === "fulfilled" && response.value.res.ok) {
                    const jsonData = await response.value.res.json();
                    result[response.value.key] = Object.fromEntries(
                        Object.entries(jsonData).map(([deviceName, deviceData]) => 
                            [topologyNodes.get(deviceName)?.id, deviceData] // Use node object to get the ID
                        ).filter(([deviceId]) => deviceId) // Remove undefined device IDs
                    );
                } else {
                    console.warn(`Failed to fetch ${response.value?.key}:`, response.reason || response.value?.res?.status);
                    result[response.value?.key] = {}; // Set empty object for failed requests
                }
            }
            return result;
        } catch (error) {
            console.error('Unexpected error fetching node data:', error);
            return {};
        }
    }
    

    // Update node statuses in topology
    updateTopologyStatus(topologyNodes, topologyEdges, topologyData) {
        const { alertsData, bwData } = topologyData;
    
        // Process node statuses
        topologyNodes.forEach((node, nodeName) => {
            try {
                let nodeStatus = alertsData?.[node.id]?.status || "ok";
                if (node.status !== nodeStatus) {
                    node.setStatus(nodeStatus);
                }
            } catch (error) {
                console.error(`Error updating status for node ${nodeName}:`, error);
            }
        });
    
        // Process edge statuses and bandwidth updates
        topologyEdges.forEach(edge => {
            try {
                const sourceDeviceId = edge.sourceNode.id;
                const targetDeviceId = edge.targetNode.id;
                const sourceInterface = edge.sourceNodeInterface;
                const targetInterface = edge.targetNodeInterface;
    
                // Determine edge status from alertsData
                let edgeStatus = alertsData?.[sourceDeviceId]?.interfaces?.[sourceInterface] 
                              ?? alertsData?.[targetDeviceId]?.interfaces?.[targetInterface]
                              ?? "ok";
    
                if (edge.status !== edgeStatus) {
                    edge.setStatus(edgeStatus);
                }
    
                // Get bandwidth values
                let speedA = bwData?.[sourceDeviceId]?.[sourceInterface]?.out
                          ?? bwData?.[targetDeviceId]?.[targetInterface]?.in;
                let labelA = speedA ? `${sourceInterface} -> ${speedA}` : sourceInterface;

                let speedB = bwData?.[targetDeviceId]?.[targetInterface]?.out
                          ?? bwData?.[sourceDeviceId]?.[sourceInterface]?.in;
                let labelB = speedB ? `${targetInterface} -> ${speedB}` : targetInterface;
                // Define labels (default to interface name if no speed data)
                
                // Function to update interface label and expansion state
                for (const [iface, newLabel] of [
                    [edge.sourceNode.interfaces[sourceInterface], labelA],
                    [edge.targetNode.interfaces[targetInterface], labelB]
                ]) {
                    if (iface && iface.labelText !== newLabel) {
                        iface.labelText = newLabel;
                        newLabel.includes(" -> ") ? iface.expand() : iface.collapse();
                    }
                }
    
            } catch (error) {
                console.error(`Error updating status or bandwidth for edge`, error);
            }
        });
    }
    
    
    

    // Main polling function
    async poll() {
        if (!this.isPolling) return;

        try {
            // Get Nodes and Edges
            const nodeList = this.getNodes();
            const edgeList = this.getEdges();
            if (nodeList.size > 0) {
                const statusData = await this.fetchNodesData(nodeList);
                this.updateTopologyStatus(nodeList, edgeList, statusData);
            }
        } catch (error) {
            console.error('Error during polling:', error);
        } finally {
            // Schedule next poll if still active
            if (this.isPolling) {
                this.pollTimer = setTimeout(() => this.poll(), this.pollInterval);
            }
        }
    }
}


if (window.dynamicUpdateEnabled == "True") {
    const pollIntervalMs = window.dynamicUpdateInterval * 1000;  // Convert seconds to milliseconds
    const poller = new NodeStatusPoller(window.nbEnpointsURL, pollIntervalMs);
    console.log("Start dynamic topology updating");
    poller.start();
}
