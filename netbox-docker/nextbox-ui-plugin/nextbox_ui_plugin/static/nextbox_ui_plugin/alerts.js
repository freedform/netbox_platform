class NodeStatusPoller {
    constructor(statusUrl, pollInterval = 5000) {
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

    // Get list of node IDs from topology
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
    updateNodeStatuses(topologyNodes, nodeAlerts) {
        console.log(topologyNodes)
        console.log(nodeAlerts)
        Object.entries(topologyNodes).forEach(([nodeName, nodeId]) => {
            try {
                let nodeStatus = "ok"
                console.log(nodeId, nodeName)
                if (nodeAlerts.hasOwn(nodeId)) {
                    console.log(nodeAlerts[nodeId]['status'])
                    nodeStatus = nodeAlerts[nodeId]['status']
                }
                window.topoSphere.topology.getNode(nodeId).setStatus(nodeStatus)
            } catch (error) {
                console.error(`Error updating status for node ${nodeId}:`, error);
            }
        });
    }

    // Main polling function
    async poll() {
        if (!this.isPolling) return;

        try {
            const nodeIds = this.getNodeIds();
            if (Object.entries(nodeIds).length > 0) {
                const statusData = await this.fetchNodeStatuses(nodeIds);
                this.updateNodeStatuses(nodeIds, statusData);
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
const poller = new NodeStatusPoller(window.deviceStatusUrl);


// Start polling
poller.start();
