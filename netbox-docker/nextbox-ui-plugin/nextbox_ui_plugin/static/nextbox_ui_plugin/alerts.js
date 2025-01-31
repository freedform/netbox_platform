class NodeStatusPoller {
    constructor(statusUrl, pollInterval) {
        this.statusUrl = statusUrl;
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

    // Fetch status for nodes
    async fetchNodeStatuses(topologyNodes) {
        try {
            let result = {}
            // Composing url filter and fetching device status data
            const filterValue = Object.keys(topologyNodes).join(",");
            const response = await fetch(`${this.statusUrl}/?filter=${filterValue}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // Parsing JSON fetch response
            let responseJson = await response.json();
            Object.entries(responseJson).forEach(([deviceName, deviceData]) => {
                result[topologyNodes[deviceName]] = deviceData
            })
            // returning { "node_id": deviceData }
            return result;
        } catch (error) {
            console.error('Error fetching node statuses:', error);
            return {};
        }
    }

    // Update node statuses in topology
    updateTopologyStatus(topologyNodes, topologyEdges, topologyAlerts) {
        // Update nodes
        Object.entries(topologyNodes).forEach(([nodeName, nodeId]) => {
            try {
                // Set default value for node status
                let nodeStatus = "ok"
                if (topologyAlerts[nodeId]) {
                    nodeStatus = topologyAlerts[nodeId]['status']
                }
                // Update node status
                window.topoSphere.topology.getNode(nodeId).setStatus(nodeStatus)
            } catch (error) {
                console.error(`Error updating status for node ${nodeName}:`, error);
            }
        });
        // Update edges
        topologyEdges.forEach(topologyEdge => {
            try {
                // Define edge sides
                const aDevice = topologyEdge['A']['device']
                const bDevice = topologyEdge['B']['device']
                const aInterface = topologyEdge['A']['interface']
                const bInterface = topologyEdge['B']['interface']
                let edgeStatus = topologyAlerts[aDevice]?.interfaces?.[aInterface] 
                                ?? topologyAlerts[bDevice]?.interfaces?.[bInterface] 
                                ?? "ok";
                // Update edge status
                window.topoSphere.topology.getNode(aDevice).interfaces[aInterface].edge.setStatus(edgeStatus)
            } catch (error) {
                console.error(`Error updating status for edge ${topologyEdge}:`, error)
            }
        })
    }

    // Main polling function
    async poll() {
        if (!this.isPolling) return;

        try {
            // Get Nodes and Edges
            const nodeList = this.getNodeIds();
            const edgeList = this.getEdges();
            if (Object.keys(nodeList).length > 0) {
                const statusData = await this.fetchNodeStatuses(nodeList);
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


// const poller = new NodeStatusPoller(window.deviceStatusUrl);
const poller = new NodeStatusPoller(window.deviceStatusUrl, window.alertsPollingInterval);


// Start polling
poller.start();
