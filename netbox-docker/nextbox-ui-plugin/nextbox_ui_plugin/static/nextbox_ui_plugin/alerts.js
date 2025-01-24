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
        if (!window.topoSphere?.topology) {
            console.error('Topology not available');
            return result;
        }
        if (!window.topoSphere.topology.nodes) {
            // Topology is empty
            return result;
        }
        window.topoSphere.topology.nodes.forEach(item => {
            result[item.customAttributes.name] = item.id;
        })
        return result;
    }

    // Fetch status for nodes
    async fetchNodeStatuses(nodeIds) {
        try {
            let result = {}
            const filterParam = Object.keys(nodeIds).join(",");
            const response = await fetch(`${this.statusUrl}/?filter='${filterParam}'`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            let responseJson = await response.json();
            Object.entries(responseJson).forEach(([deviceName, deviceData]) => {
                result[nodeIds[deviceName]] = deviceData
            })
            return result;
        } catch (error) {
            console.error('Error fetching node statuses:', error);
            return {};
        }
    }

    // Update node statuses in topology
    updateNodeStatuses(data) {
        console.log(data)
        Object.entries(data).forEach(([deviceId, deviceData]) => {
            try {
                const node = window.topoSphere.topology.getNode(deviceId);
                if (node) {
                    node.setStatus(deviceData);
                }
            } catch (error) {
                console.error(`Error updating status for node ${deviceId}:`, error);
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
                this.updateNodeStatuses(statusData);
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
