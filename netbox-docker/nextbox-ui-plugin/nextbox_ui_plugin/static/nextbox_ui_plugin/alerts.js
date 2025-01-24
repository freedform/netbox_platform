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
        let result = {};
        //Topology is unavailable
        if (!window.topoSphere?.topology) {
            console.error('Topology not available');
            return result;
        }
        // Topology is empty
        if (!window.topoSphere.topology.nodes) {
            return result;
        }
        window.topoSphere.topology.nodes.forEach(item => {
            result[item.customAttributes.name] = item.id;
        })
        // returning { "node_name": "node_id" }
        return result;
    }

    // Get topology Edges
    getEdges() {
        let result = [];
        //Topology is unavailable
        if (!window.topoSphere?.topology) {
            console.error('Topology not available');
            return result;
        }
        // Topology is empty
        if (!window.topoSphere.topology.nodes) {
            return result;
        }
        window.topoSphere.topology.edges.forEach(item => {
            result.push({
                A: {device: item.sourceNode.id, inteface: item.sourceNodeInterface},
                B: {device: item.targetNode.id, inteface: item.targetNodeInterface},
            })
        })
        return result;
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
        Object.entries(topologyNodes).forEach(([nodeName, nodeId]) => {
            try {
                // Set default value for node status
                let nodeStatus = "ok"
                if (topologyAlerts.hasOwnProperty(nodeId)) {
                    nodeStatus = topologyAlerts[nodeId]['status']
                }
                // Update node status
                window.topoSphere.topology.getNode(nodeId).setStatus(nodeStatus)
            } catch (error) {
                console.error(`Error updating status for node ${nodeName}:`, error);
            }
        });

        topologyEdges.forEach(topologyEdge => {
            const aDevice = topologyEdge['A']['device']
            const bDevice = topologyEdge['B']['device']
            const aInterface = topologyEdge['A']['inteface']
            const bInterface = topologyEdge['B']['inteface']
            let edgeStatus = "ok"

            if (topologyAlerts.hasOwnProperty(aDevice) && topologyAlerts[aDevice].hasOwnProperty(aInterface)) {
                edgeStatus = topologyAlerts[aDevice][aInterface]
            } else if (topologyAlerts.hasOwnProperty(bDevice) && topologyAlerts[bDevice].hasOwnProperty(bInterface)) {
                edgeStatus = topologyAlerts[bDevice][bInterface]
            }
            
            window.topoSphere.topology.getNode(aDevice).interfaces[aInterface].edge.setStatus(edgeStatus)
        })
    }

    // Main polling function
    async poll() {
        if (!this.isPolling) return;

        try {
            const nodeList = this.getNodeIds();
            const edgeList = this.getEdges();
            if (Object.entries(nodeList).length > 0) {
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
