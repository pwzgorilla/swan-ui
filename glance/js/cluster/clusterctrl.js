function clusterCtrl($scope, $state, $rootScope, glanceHttp, Notification) {
    $rootScope.show = "cluster";

    $scope.clusterNames = [];

    $scope.statName = {
        "running": "运行正常",
        "terminated": "主机失联",
        "failed": "主机预警",
        "installing": "主机初始化中"
    };

    $scope.nodeAttributes = {
        "transient": "计算节点",
        "gateway": "外部网关",
        "proxy": "内部代理",
        "persistent": "数据节点"
    };

    $scope.serviceState = {};
    
    $scope.deleteCluster = function(clusterId, name) {
        $('#confirmDeleteCluster').hide();
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
        glanceHttp.ajaxDelete(['cluster.clusterIns', {cluster_id: clusterId}], function () {
            Notification.success('集群' + name + '删除成功');
            $state.go("cluster.listclusters", null, {reload: true});
        });
    }

    $scope.upgradeAgent = function (clusterId) {
        glanceHttp.ajaxPut('cluster.cluster', {"id": clusterId, "isUpdateAgent": true}, function() {
            Notification.success("设置升级集群 Agent 成功")
        });
    }

    $scope.getClass = function(status) {
        var classes = {
            'running': 'text-success',
            'terminated': 'text-danger',
            'failed': 'text-danger',
            'installing': 'text-danger'
        };
        return classes[status];
    };

    $scope.getIsMaster = function(node) {
        return node.role === "master";
    };

    function getNodeServicesState(services, isMaster) {
        var serviceState = "running";
        var masterServiceNames = ['zookeeper', 'master', 'marathon'];
        var runningNumber = 0;
        for (var i=0; i<services.length; i++) {
            service = services[i];
            if (service.status === "installing") {
                serviceState = "installing";
                break;
            } else if (service.status == "failed") {
                if (isMaster && masterServiceNames.indexOf(service.name) > -1) {
                    serviceState = "failed";
                    break;
                } else if (!isMaster && service.name == "slave") {
                    serviceState = "failed";
                    break;
                }
            } else if (service.status == "uninstalled") {
                if (isMaster && masterServiceNames.indexOf(service.name) > -1) {
                    serviceState = "installing";
                    break;
                } else if (!isMaster && service.name == "slave") {
                    serviceState = "installing";
                    break;
                }
            }
        }
        return serviceState;
    }

    $scope.getNodeState = function(node) {
        var isMaster = $scope.getIsMaster(node);
        var servicesState = getNodeServicesState(node.services, isMaster);
        var showState;
        if (node.status === NODE_STATUS.terminated){
            showState =  NODE_STATUS.terminated;
        } else if(node.status === NODE_STATUS.installing || servicesState === 'installing') {
            showState = NODE_STATUS.installing;
        } else if(servicesState === 'failed') {
            showState = NODE_STATUS.failed;
        } else {
            showState = NODE_STATUS.running;
        }
        return showState;
    };

    $scope.getSeriveState = function (nodeServices) {
        for (var i = 0; i < nodeServices.length; i++) {
            if (nodeServices[i].name === "marathon") {
                $scope.serviceState.marathon = nodeServices[i].status;
            } else if (nodeServices[i].name === "master") {
                $scope.serviceState.mesos = nodeServices[i].status;
            } else if (nodeServices[i].name === "zookeeper") {
                $scope.serviceState.zookeeper = nodeServices[i].status;
            } else if (nodeServices[i].name === "slave") {
                $scope.serviceState.slave = nodeServices[i].status;
            }
        }
    };

    $scope.concatObjtoArr = function(obj) {
        var arr = [];
        $.each(obj, function(key, val) {
            arr = arr.concat(val);
        });
        return arr;
    }

    function groupMasters(nodes) {
        var cluster = {
            masters: [],
            nonMasters: []
        };
        if (nodes && nodes.length) {
            var isMaster;
            $.each(nodes, function(index, node) {
                isMaster = $scope.getIsMaster(node);
                if (isMaster) {
                    cluster.masters.push(node);
                }else{
                    cluster.nonMasters.push(node);
                }
            });
        }
        return cluster;
    }

    function classifyNodesByState(nodes) {
        var groups = {}
        var showState;
        var showStates = Object.keys(NODE_STATUS);
        $.each(showStates, function(index, key) {
            groups[key] = [];
        });
        if(nodes && nodes.length) {
            $.each(nodes, function(nodeIndex, node) {
                showState = $scope.getNodeState(node);
                node.showState = showState;
                groups[showState].push(node);
            });
        }
        return groups;
    }

    $scope.groupMasterWithState = function(nodes) {
        var groupsWithState = {};
        var cluster = groupMasters(nodes);
        $.each(cluster, function(key, val) {
            groupsWithState[key] = classifyNodesByState(val);
        });
        return groupsWithState;
    }

    $scope.getClusterNames = function(clusters) {
        $scope.clusterNames = [];
        if (clusters && clusters.length) {
            $.each(clusters, function(index, cluster) {
                $scope.clusterNames.push(cluster.name);
            });
        }
    }
}

clusterCtrl.$inject = ["$scope", "$state", "$rootScope", "glanceHttp", 'Notification'];
glanceApp.controller('clusterCtrl', clusterCtrl);
