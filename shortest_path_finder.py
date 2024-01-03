import osmnx as ox
import networkx as nx
from geopy.distance import geodesic
import heapq

class ShortestPathFinder:
    """A class for finding the shortest path in a graph using Dijkstra's algorithm."""
    def __init__(self, place_name="Kathmandu, Nepal", network_type="drive", buffer_dist=500):
        """Initialize the ShortestPathFinder with a graph of the specified location."""
        self.graph = self.fetch_graph(place_name, network_type, buffer_dist)
    
    def fetch_graph(self, place_name, network_type, buffer_dist):
        """Fetch and process the graph for the specified location."""
        G = ox.graph_from_place(place_name, network_type=network_type, buffer_dist=buffer_dist)
        if not nx.is_strongly_connected(G):
            connected_components = list(nx.strongly_connected_components(G))
            largest_component = max(connected_components, key=len)
            G = G.subgraph(largest_component).copy()
        return G
    
    def dijkstra(self, start, end):
        """Find the shortest path and its distance between two nodes using Dijkstra's algorithm."""
        distances = {node: float('infinity') for node in self.graph.nodes}
        predecessors = {node: None for node in self.graph.nodes}
        priority_queue = [(0, start)]
        distances[start] = 0

        while priority_queue:
            current_distance, current_node = heapq.heappop(priority_queue)

            if current_node == end:
                path = []
                while current_node is not None:
                    path.insert(0, current_node)
                    current_node = predecessors[current_node]
                return path, distances[end]

            for neighbor in self.graph.neighbors(current_node):
                # Calculate geographic distance using geopy
                coord1 = (self.graph.nodes[current_node]['y'], self.graph.nodes[current_node]['x'])
                coord2 = (self.graph.nodes[neighbor]['y'], self.graph.nodes[neighbor]['x'])
                edge_length = geodesic(coord1, coord2).meters
                
                new_distance = distances[current_node] + edge_length

                if new_distance < distances[neighbor]:
                    distances[neighbor] = new_distance
                    predecessors[neighbor] = current_node
                    heapq.heappush(priority_queue, (new_distance, neighbor))

        return None, None
    
    def find_shortest_path(self, start_point, end_point):
        """Find the shortest path and its distance between two points."""
        start_node = ox.distance.nearest_nodes(self.graph, start_point.x, start_point.y)
        end_node = ox.distance.nearest_nodes(self.graph, end_point.x, end_point.y)
        shortest_path, distance = self.dijkstra(start=start_node, end=end_node)
        return shortest_path, distance
    
    def get_coordinates(self, node_list):
        """Extract coordinates from a list of nodes."""
        return [[self.graph.nodes[node]['y'], self.graph.nodes[node]['x']] for node in node_list]
