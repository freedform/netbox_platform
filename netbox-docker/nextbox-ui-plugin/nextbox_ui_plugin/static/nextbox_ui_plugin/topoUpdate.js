class NodeStatusPoller {
    constructor(alertsURL, bwURL, pollInterval) {
        this.alertsURL = alertsURL;
        this.bwURL = bwURL;
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
    getNodeIds() {
        if (!window.topoSphere?.topology?.nodes) {
            console.error('Node are not available');
            return {};
        }
        // Returning { "node_name": "node_id" }
        return Object.fromEntries(window.topoSphere.topology.nodes.map(item => [item.customAttributes.name, item.id]));
    }

    // Get topology Edges
    getEdges() {
        if (!window.topoSphere?.topology?.edges) {
            console.error('Edges are not available');
            return [];
        }
        // Returining a list of dicts:
        // {
        //      "A": { "device": "device_id" },
        //      "B": { "device": "device_id" },
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
            const filterValue = Object.keys(topologyNodes).join(",");
            
            // Define API endpoints
            const endpoints = {
                alertsData: `${this.alertsURL}/?endpoint=alerts&filter=${filterValue}`,
                bwData: `${this.bwURL}/?endpoint=bw&filter=${filterValue}`
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
                            [topologyNodes[deviceName], deviceData]
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
    
        Object.entries(topologyNodes).forEach(([nodeName, nodeId]) => {
            try {
                let nodeStatus = alertsData?.[nodeId]?.status || "ok";
                let node = window.topoSphere.topology.getNode(nodeId);
    
                if (node.status !== nodeStatus) {
                    node.setStatus(nodeStatus);
                }
            } catch (error) {
                console.error(`Error updating status for node ${nodeName}:`, error);
            }
        });
    
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
                if (bwData?.[aDevice]?.[aInterface]) {
                    // window.topoSphere.topology.getNode(aDevice).interfaces[aInterface].setBw(bwData[aDevice][aInterface]);
                    console.log(bwData[aDevice][aInterface])
                }
                if (bwData?.[bDevice]?.[bInterface]) {
                    // window.topoSphere.topology.getNode(bDevice).interfaces[bInterface].setBw(bwData[bDevice][bInterface]);
                    console.log(bwData[bDevice][bInterface])
                }
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
            const nodeList = this.getNodeIds();
            const edgeList = this.getEdges();
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
    const poller = new NodeStatusPoller(window.alertsURL, window.bwURL, pollIntervalMs);
    console.log("Start dynamic topology updating");
    poller.start();
}
