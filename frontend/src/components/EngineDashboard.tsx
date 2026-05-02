import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Play, 
  RefreshCw, 
  Settings, 
  TrendingUp,
  Zap,
  Pause,
  Trash2
} from 'lucide-react';
import { enginesApi, EngineDashboard as EngineDashboardType, EngineExecution, EngineMetrics } from '@/services/enginesApi';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const EngineDashboardComponent: React.FC = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<EngineDashboardType | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<string>('');
  const [engineMetrics, setEngineMetrics] = useState<EngineMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningEngine, setIsRunningEngine] = useState<string>('');

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedEngine) {
      loadEngineMetrics(selectedEngine);
    }
  }, [selectedEngine]);

  const loadDashboard = async () => {
    try {
      const data = await enginesApi.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load engine dashboard:', error);
      toast.error('Failed to load engine dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEngineMetrics = async (engineName: string) => {
    try {
      const metrics = await enginesApi.getMetrics(engineName);
      setEngineMetrics(metrics);
    } catch (error) {
      console.error('Failed to load engine metrics:', error);
      toast.error('Failed to load engine metrics');
    }
  };

  const runEngine = async (engineName: string) => {
    setIsRunningEngine(engineName);
    try {
      await enginesApi.runEngine(engineName);
      toast.success(`Engine ${engineName} started successfully`);
      setTimeout(() => {
        loadDashboard();
        if (selectedEngine === engineName) {
          loadEngineMetrics(engineName);
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to run engine:', error);
      toast.error(`Failed to run ${engineName}`);
    } finally {
      setIsRunningEngine('');
    }
  };

  const toggleEngine = async (engineName: string, enabled: boolean) => {
    try {
      await enginesApi.toggleEngine(engineName, enabled);
      toast.success(`Engine ${engineName} ${enabled ? 'enabled' : 'disabled'}`);
      loadDashboard();
    } catch (error) {
      console.error('Failed to toggle engine:', error);
      toast.error(`Failed to ${enabled ? 'enable' : 'disable'} ${engineName}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading Engine Dashboard...</span>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Failed to load engine dashboard
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engines</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.overview.totalEngines}</div>
            <p className="text-xs text-muted-foreground">
              Computational engines
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Engines</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboard.overview.activeEngines}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Engines</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboard.overview.failedEngines}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(dashboard.overview.uptime)}</div>
            <p className="text-xs text-muted-foreground">
              Continuous operation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="engines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engines">Engines</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="engines" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashboard.engines.map((engine) => (
              <Card key={engine.engine} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedEngine(engine.engine)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{engine.engine}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(engine.status)}
                      <Badge className={getStatusColor(engine.status)}>
                        {engine.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    Frequency: {engine.frequency} • {engine.enabled ? 'Enabled' : 'Disabled'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Enabled</span>
                      <Switch
                        checked={engine.enabled}
                        onCheckedChange={(enabled) => toggleEngine(engine.engine, enabled)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    {engine.lastRun && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Last run: </span>
                        {new Date(engine.lastRun).toLocaleString()}
                      </div>
                    )}
                    
                    {engine.nextRun && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Next run: </span>
                        {new Date(engine.nextRun).toLocaleString()}
                      </div>
                    )}
                    
                    {engine.duration && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Duration: </span>
                        {formatDuration(engine.duration)}
                      </div>
                    )}
                    
                    {engine.error && (
                      <div className="text-sm text-red-600">
                        <span className="font-medium">Error: </span>
                        {engine.error}
                      </div>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        runEngine(engine.engine);
                      }}
                      disabled={isRunningEngine === engine.engine || !engine.enabled}
                    >
                      {isRunningEngine === engine.engine ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Run Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>System-wide performance statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Average Execution Time</span>
                    <span>{formatDuration(dashboard.performance.averageExecutionTime)}</span>
                  </div>
                  <Progress value={Math.min((dashboard.performance.averageExecutionTime / 10000) * 100, 100)} className="mt-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Last Execution</span>
                    <span>{dashboard.performance.lastExecution ? new Date(dashboard.performance.lastExecution).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span>
                      {dashboard.engines.length > 0 
                        ? Math.round((dashboard.engines.filter(e => e.status === 'completed').length / dashboard.engines.length) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={dashboard.engines.length > 0 
                      ? (dashboard.engines.filter(e => e.status === 'completed').length / dashboard.engines.length) * 100
                      : 0} 
                    className="mt-2" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Executions</CardTitle>
                <CardDescription>Latest engine runs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.performance.recentExecutions.slice(0, 5).map((execution, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(execution.success ? 'completed' : 'failed')}
                        <div>
                          <div className="text-sm font-medium">{execution.engine}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(execution.startTime).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{formatDuration(execution.duration)}</div>
                        <Badge variant={execution.success ? 'default' : 'destructive'} className="text-xs">
                          {execution.success ? 'Success' : 'Failed'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>Recent engine execution history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard.performance.recentExecutions.map((execution, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(execution.success ? 'completed' : 'failed')}
                      <div>
                        <div className="font-medium">{execution.engine}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(execution.startTime).toLocaleString()} - {new Date(execution.endTime).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatDuration(execution.duration)}</div>
                      <Badge variant={execution.success ? 'default' : 'destructive'}>
                        {execution.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Engine Details Modal/Panel */}
      {selectedEngine && engineMetrics && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {selectedEngine} - Detailed Metrics
              <Button variant="ghost" size="sm" onClick={() => setSelectedEngine('')}>
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2">Performance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span>{engineMetrics.successRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Duration:</span>
                    <span>{formatDuration(engineMetrics.averageDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Executions:</span>
                    <span>{engineMetrics.executions.length}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Schedule</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Frequency:</span>
                    <span>{engineMetrics.schedule.frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge className={getStatusColor(engineMetrics.schedule.status)}>
                      {engineMetrics.schedule.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Enabled:</span>
                    <span>{engineMetrics.schedule.enabled ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Recent Activity</h4>
                <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
                  {engineMetrics.executions.slice(0, 5).map((exec, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{new Date(exec.startTime).toLocaleString()}</span>
                      <Badge variant={exec.success ? 'default' : 'destructive'} className="text-xs">
                        {exec.success ? '✓' : '✗'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {engineMetrics.lastError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded">
                <h4 className="font-medium text-red-800 mb-1">Last Error</h4>
                <p className="text-sm text-red-600">{engineMetrics.lastError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EngineDashboardComponent;
