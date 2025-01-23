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
        if (!window.topoSphere?.topology) {
            console.error('Topology not available');
            return [];
        }
        if (!window.topoSphere.topology.nodes) {
            // Topology is empty
            return [];
        }
        return window.topoSphere.topology.nodes.map(node => node.id);
    }

    // Fetch status for nodes
    async fetchNodeStatuses(nodeIds) {
        try {
            console.log("start status check")
            let nodeNames = [];
            let nameToIdMap = {};
            nodeIds.forEach(nodeId => {
                const node = window.topoSphere.topology.getNode(nodeId);
                nodeNames.push(node.customAttributes.name);
                nameToIdMap[node.customAttributes.name] = nodeId;
            })
            const filterParam = nodeNames.join(',');
            const response = await fetch(`${this.statusUrl}/?filter='${filterParam}'`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            let responseJson = await response.json();
            return {nameToId: nameToIdMap, statusData: responseJson};
        } catch (error) {
            console.error('Error fetching node statuses:', error);
            return {};
        }
    }

    // Update node statuses in topology
    updateNodeStatuses(data) {
        const nameToIdMap = data.nameToId;
        const statusData = data.statusData;
        Object.entries(statusData).forEach(([name, data]) => {
            try {
                const node = window.topoSphere.topology.getNode(nameToIdMap[name]);
                if (node) {
                    node.setStatus(data);
                }
            } catch (error) {
                console.error(`Error updating status for node ${id}:`, error);
            }
        });
    }

    // Main polling function
    async poll() {
        if (!this.isPolling) return;

        try {
            const nodeIds = this.getNodeIds();
            if (nodeIds.length > 0) {
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
