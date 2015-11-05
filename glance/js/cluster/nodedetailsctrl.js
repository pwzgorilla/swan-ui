function nodeDetailsCtrl($rootScope, $scope, $stateParams, glanceHttp, unitConversion, buildCharts, monitor) {
    $scope.node = {};
    $scope.showCharts = false;
    $scope.getCurNode = function () {
        var showStates = ['normal', 'disconnect', 'warning', 'reset'];
        glanceHttp.ajaxGet(["cluster.getNode", {node_id: $stateParams.nodeId}], function (data) {
            $scope.node = data.data;
            $scope.node.state = $scope.getNodeState($scope.node, showStates);
            $scope.isMasterFlag = $scope.getIsMaster($scope.node);
            $scope.getSeriveState($scope.node.services);
        });
    };
    $scope.getCurNode();

    $scope.DOMs = {
        cpu: 'node-cpu-chart',
        memory: 'node-memory-chart',
        disk: 'node-disk-chart'
    };

    $scope.unitConversion = unitConversion;

    $scope.getNodeMetricData = function (nodeId) {
        glanceHttp.ajaxGet(["cluster.getNodeMonitor", {node_id: nodeId}], function(data) {
            if(data.data.length) {
                $scope.nodeInfo = getNodeInfo(data.data[0]);
            }
            var chartsData = monitor.httpMonitor.getChartsData(data.data);
            buildCharts.lineCharts(chartsData, $scope.DOMs, 'node');
            $scope.showCharts = true;
            addMetricData(data);
        });
    };

    $scope.getNodeMetricData($stateParams.nodeId);

    function addMetricData(data) {
        var nodesData = data.data;
        $scope.$on('newNodeMetric-'+ $stateParams.nodeId, function(event, data){
            var maxNodesNumber = 180;
            if(nodesData.length) {
                var wsTime = monitor.calHourMin(data.timestamp);
                var chartsTime = monitor.calHourMin(nodesData[0].timestamp);
                if (wsTime < chartsTime) {
                    return;
                }
            }
            var nodeInfo = getNodeInfo(data)
            if (nodeInfo) {
                $scope.nodeInfo = nodeInfo;
            }

            nodesData.splice(0, 0, data);
            if(nodesData.length > maxNodesNumber) {
                nodesData.pop();
            }
            var chartsData = monitor.httpMonitor.getChartsData(nodesData);
            buildCharts.lineCharts(chartsData, $scope.DOMs, 'node');
        });
    }

    function getNodeInfo(data) {
        var nodeInfo = {};
        var keys = ['cpuPercent', 'osVersion', 'agentVersion', 'memTotal', 'dockerVersion'];
        var key;
        for (var i = 0; i < keys.length; i++) {
            key = keys[i];
            if(data[key]) {
                nodeInfo[key] = data[key];
            } else {
                return false;
            }
        }
        nodeInfo.cpuNumber = nodeInfo.cpuPercent.length;
        return nodeInfo;
    }
}

nodeDetailsCtrl.$inject = ["$rootScope", "$scope", "$stateParams", "glanceHttp", "unitConversion", "buildCharts", "monitor"];
glanceApp.controller("nodeDetailsCtrl", nodeDetailsCtrl);
