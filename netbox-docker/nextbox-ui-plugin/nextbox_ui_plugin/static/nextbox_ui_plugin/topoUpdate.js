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

    // Get topology Nodes
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
        // Returining a list of dicts:
        // {
        //      "A": { "device": "device_id", "interface": "interface_name" },
        //      "B": { "device": "device_id", "interface": "interface_name" },
        // }
        return window.topoSphere.topology.edges.map(item => ({
            A: { device: item.sourceNode.id, interface: item.sourceNodeInterface },
            B: { device: item.targetNode.id, interface: item.targetNodeInterface }
        }));
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
        const { alertsData, bwData } = topologyData; // Extract alerts and bandwidth data
        console.log(topologyData)
        // Process node statuses using pre-fetched node objects
        Object.entries(topologyNodes).forEach(([nodeName, node]) => {
            console.log(nodeName, node.status)
            try {
                let nodeStatus = alertsData?.[node.id]?.status || "ok";
                if (node.status !== nodeStatus) {
                    node.setStatus(nodeStatus);
                }
            } catch (error) {
                console.error(`Error updating status for node ${nodeName}:`, error);
            }
        });
    
        // Keep the edge processing logic unchanged
        topologyEdges.forEach(topologyEdge => {
            try {
                const aDevice = topologyEdge['A']['device'];
                const bDevice = topologyEdge['B']['device'];
                const aInterface = topologyEdge['A']['interface'];
                const bInterface = topologyEdge['B']['interface'];
    
                // Determine edge status from alertsData
                let edgeStatus = alertsData?.[aDevice]?.interfaces?.[aInterface]
                              ?? alertsData?.[bDevice]?.interfaces?.[bInterface]
                              ?? "ok";
                let edge = window.topoSphere.topology.getNode(aDevice).interfaces[aInterface].edge;
    
                if (edge.status !== edgeStatus) {
                    edge.setStatus(edgeStatus);
                }
    
                // Update bandwidth for both interfaces if present in bwData
                // if (bwData?.[aDevice]?.[aInterface]) {
                //     console.log(bwData[aDevice][aInterface]);
                // }
                // if (bwData?.[bDevice]?.[bInterface]) {
                //     console.log(bwData[bDevice][bInterface]);
                // }
            } catch (error) {
                console.error(`Error updating status or bandwidth for edge ${JSON.stringify(topologyEdge)}:`, error);
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
            console.log(nodeList)
            console.log(edgeList)
            console.log(Object.keys(nodeList).length)
            if (Object.keys(nodeList).length > 0) {
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
