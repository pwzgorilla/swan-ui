/**
 * Created by my9074 on 16/3/2.
 */
(function () {
    'use strict';
    angular.module('glance.app')
        .controller('CreateAppCtrl', CreateAppCtrl);

    CreateAppCtrl.$inject = [
        'appservice', 
        'Notification', 
        'multiSelectConfig', 
        '$scope', 
        'clusterBackendService', 
        'appLabelService',
        'createAppPortModal',
        'formModal',
        '$state',
        'target',
        'app',
        '$rootScope'
    ];

    function CreateAppCtrl(
        appservice, 
        Notification, 
        multiSelectConfig, 
        $scope, 
        clusterBackendService, 
        appLabelService,
        createAppPortModal,
        formModal,
        $state,
        target,
        app,
        $rootScope
    ) {
        
        $rootScope.show = "application";
        
        var self = this;
        self.target = target;
        
        self.gateWays = [];
        self.proxyNodes = [];
        
        var existPorts;
        if (self.target === 'create') {
            self.form = {
                    cluster_id: '',
                    name: '',
                    instances: 1,
                    volumes: [],
                    portMappings: [],
                    cpus: 0.1,
                    mem: 16,
                    cmd: '',
                    envs: [],
                    imageName: '',
                    imageVersion: '',
                    forceImage: false,
                    network: 'BRIDGE',
                    constraints: [],
                    logPaths: []
            };
        } else {
            self.form = {
                cluster_id: app.cid,
                name: app.name,
                instances: app.instances,
                volumes: app.volumes,
                portMappings: app.ports,
                cpus: app.cpus,
                mem: app.mem,
                cmd: app.cmd,
                envs: app.envs,
                imageName: app.imageName,
                imageVersion: app.imageVersion,
                forceImage: false,
                network: app.network,
                logPaths: app.logPaths
            };
            if (!self.form.logPaths) {
                self.form.logPaths = [];
            }
            refresClusterData(app.cid, app.id);
            self.single = app.unique;
        }

        self.appNames = [];
        self.clusters = [];
        self.APP_PORT_TYPE = APP_PORT_TYPE;
        self.APP_PROTOCOL_TYPE = APP_PROTOCOL_TYPE;
        listApps();
        listClusters();

        self.multiSelect = {
            labels: [],
            selectedLabels: [],
            nodes: [],
            selectedNodes: [],
            nodesWithLabels: {},
            ip: [],
            config: {
                label: multiSelectConfig.setMultiConfig('全部选择', '清空', '恢复', '查询匹配词', '标签'),
                node: multiSelectConfig.setMultiConfig('全部选择', '清空', '恢复', '查询匹配词', '主机 (默认随机)')
            }
        };

        self.refresClusterData = refresClusterData; 
        
        function refresClusterData(cluster_id, app_id) {
            if (!cluster_id) {
                cluster_id = self.form.cluster_id;
            }
            clusterBackendService.getCluster(cluster_id)
                .then(function(cluster) {
                    self.multiSelect.labels = appLabelService.listClusterLabels(cluster.nodes);
                    self.multiSelect.nodes = cluster.nodes;
                    setGatewayAndProxy(cluster.nodes);
                    self.clusterName = cluster.name;
                });
            appservice.listAppPorts(cluster_id, app_id).then(function (data) {
                existPorts = data;
            })
        };
        
        function setGatewayAndProxy(nodes) {
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].attributes.length) {
                    for (var j = 0; j < nodes[i].attributes.length; j++) {
                        if (nodes[i].attributes[j].attribute === 'gateway') {
                            self.gateWays.push(nodes[i]);
                        }

                        if (nodes[i].attributes[j].attribute === 'proxy') {
                            self.proxyNodes.push(nodes[i]);
                        }
                    }
                }
            }

        }

        // 标签主机多选框
        self.tickItem = function(data) {
            listNodesBySelectedLabels();
        };

        self.tickAllLabels = function() {
            angular.extend(self.multiSelect.selectedLabels, self.multiSelect.labels);
            self.multiSelect.selectedNodes = [];
            self.multiSelect.nodes = [];
            listNodesBySelectedLabels();
        };

        self.clearLabels = function() {
            self.multiSelect.selectedLabels = [];
            self.multiSelect.selectedNodes = [];
            setTick(self.multiSelect.nodes, undefined);
        };

        self.tickAllNodes = function() {
            angular.extend(self.multiSelect.selectedNodes, self.multiSelect.nodes);
            setTick(self.multiSelect.selectedNodes, true);
        };

        self.clearNode = function() {
            self.multiSelect.selectedNodes = [];
            setTick(self.multiSelect.selectedNodes, undefined);
        };

        // 挂载点
        self.openVolumeModule = function () {
            formModal.open('/application/createupdate/modals/create-volume.html').then(function (volume) {
                if (isDisableAddList(volume, self.form.volumes, ['containerPath'])) {
                    Notification.error('无法映射主机的多个目录到同一个容器目录');
                } else {
                    self.form.volumes.push(volume);
                }
            })
        };


        self.containerConfig = {
            cpu: {
                min: 1,
                max: 10,
                options: {
                    step: 1,
                    floor: 1,
                    ceil: 10,
                    showSelectionBar: true,
                    translate: function (value) {
                        return self.form.cpus = value / 10.0;
                    }
                }
            },
            mem: {
                min: 4,
                max: 12,
                options: {
                    step: 1,
                    floor: 4,
                    ceil: 12,
                    showSelectionBar: true,
                    translate: function (value) {
                        return self.form.mem = Math.pow(2, value);
                    }
                }
            }
        };
        self.cpuSlideValue = self.form.cpus * 10;
        self.memSlideValue = Math.log(self.form.mem)/Math.LN2;

        self.openPathModule = function () {
            formModal.open('/application/createupdate/modals/create-path.html').then(function (path) {
                if (isDisableAddList(path, self.form.envs, ['key'])) {
                    Notification.error('添加的环境变量的 KEY 不能重复');
                } else {
                    self.form.envs.push(path);
                }
            })
        };

        self.deleteConfig = function (index, key) {
            self.form[key].splice(index, 1);
        };

        // // 应用地址
        
        self.openPortModule = function () {
            if (!self.proxyNodes.length && !self.gateWays.length) {
                Notification.warning('没有选择集群或集群中没有网关和代理节点，无法添加应用地址，请选择集群并增加网关/代理节点后重试');
                return
            }
            createAppPortModal.open(existPorts, self.proxyNodes, self.gateWays).then(function (portInfo) {
                if (isDisableAddList(portInfo, self.form.portMappings, ['type', 'mapPort', 'uri'])) {
                    Notification.error('添加的应用地址已存在');
                } else {
                    self.form.portMappings.push(portInfo);
                }
            });
        }
        
        //日志路径
        self.openLogPathModule = function () {
            formModal.open('/application/createupdate/modals/create-logpath.html', {dataName: 'path'}).then(function (path) {
                if (isDisableAddList(path, self.form.logPaths)) {
                    Notification.error('添加的日志路径不能重复');
                } else {
                    self.form.logPaths.push(path);
                }
            })
        }

        self.createApp = function () {
            setConstraints();

            return appservice.createApp(self.form, self.form.cluster_id)
                .then(function (data) {
                    Notification.success('应用' + self.form.name + '创建中！');
                    $state.go('appdetails.config', {cluster_id: self.form.cluster_id, app_id: data}, {reload: true});
                }, function (resp) {
                    Notification.error('应用' + self.form.name + '创建失败:' + getCodeMessage(resp.code));
                });
        };
        
        self.updateApp = function () {
            setConstraints();
            delete self.form.cluster_id;
            return appservice.updateApp(self.form, app.cid, app.id)
                .then(function (data) {
                    $state.go('appdetails.version', {cluster_id: app.cid, app_id: app.id}, {reload: true});
                }, function (resp) {
                    Notification.error('应用' + app.name + '跟新失败:' + getCodeMessage(resp.code));
                });
        };

        function listApps() {
            appservice.listApps()
                .then(function(data) {
                    angular.forEach(data.App, function(app, index) {
                        self.appNames.push(app.appName);
                    });
                });
        }

        function listClusters() {
            clusterBackendService.listClusters()
                .then(function(clusters) {
                    angular.forEach(clusters, function(cluster, index) {
                        self.clusters.push({id: cluster.id, name: cluster.name});
                    });
                });
        }

        function listNodesBySelectedLabels() {
            return appLabelService.listNodesByLabelIds(self.multiSelect.selectedLabels, self.form.cluster_id)
                .then(function(nodes) {
                    self.multiSelect.nodes = nodes;
                    self.multiSelect.selectedNodes = nodes;
                    setTick(self.multiSelect.selectedNodes, true);
                });
        }

        function setTick(items, value) {
            angular.forEach(items, function(item, index) {
                item.tick = value;
            });
        }
        
        function isDisableAddList(info, infoArray, attrnames) {
            function equal(info1, info2) {
                if (attrnames) {
                    for (var i = 0; i < attrnames.length; i++) {
                        if (info1[attrnames[i]] != info2[attrnames[i]]) {
                            return false;
                        }
                    }
                    return true;
                } else {
                    return info1 === info2
                }
            }

            for (var i = 0; i < infoArray.length; i++) {
                if (equal(info, infoArray[i])) {
                    return true;
                }
            }
            return false;
        }
        
        function setConstraints() {
            var defaultEles = [];
            var hostEles = ["hostname", "UNIQUE"];
            if (self.multiSelect.selectedNodes) {
                self.form.constraints = getConstraintsByNode(self.multiSelect.selectedNodes, defaultEles, 'ip');
            } else {
                self.form.constraints = defaultEles;
            }
            if (self.single) {
                self.form.constraints.push(hostEles)
            }
        }
        
        function getConstraintsByNode(nodesSelect, elements, attribute) {
            if (attribute === 'ip') {
                var temp = ["ip", "LIKE"];
            } else if (attribute === 'lableName') {
                var temp = ["lable", "LIKE"];
            }

            var regular = nodesSelect.map(function (item) {
                return item[attribute]
            }).join('|');

            if (nodesSelect.length) {
                temp.push(regular);
                elements.push(temp);
            }
            return elements;
        };

    }
})();