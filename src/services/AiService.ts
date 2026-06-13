import axios from 'axios';

const BACKEND_BASE = process.env.REACT_NATIVE_APP_BACKEND_URL || 'http://10.0.2.2:3000';

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tags?: Record<string, string>;
}

class AiService {
  async getNearbyPlaces(lat: number, lng: number, radius = 500): Promise<Place[]> {
    const resp = await axios.get(`${BACKEND_BASE}/places`, { params: { lat, lng, radius } });
    return resp.data;
  }

  async describePlace(place: Place) {
    const resp = await axios.post(`${BACKEND_BASE}/ai/describe`, { place });
    return resp.data;
  }
}

export default new AiService();
