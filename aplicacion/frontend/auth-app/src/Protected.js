import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ProtectedPage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableBonds, setAvailableBonds] = useState([]);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [users, setUsers] = useState({});
  
  // For issuer form
  const [bondDetails, setBondDetails] = useState({
    bond_amount: '',
    maturity_date: '',
    yield_rate: '',
    comment: ''
  });
  
  // For transaction status
  const [transactionStatus, setTransactionStatus] = useState({
    message: '',
    type: '' // 'success' or 'error'
  });
  
  // Function to fetch user data by ID
  const fetchUserData = async (userId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/${userId}`);
      if (!response.ok) {
        return { username: `User ${userId}`, role: 'unknown' };
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      return { username: `User ${userId}`, role: 'unknown' };
    }
  };

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        // Verify token
        const tokenResponse = await fetch(`${process.env.REACT_APP_API_URL}/verify-token/${token}`);
        if (!tokenResponse.ok) {
          throw new Error('Token verification failed');
        }
        
        // Get user data
        const userResponse = await fetch(`${process.env.REACT_APP_API_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const userData = await userResponse.json();
        setUserData(userData);
        setUserRole(userData.role);
        
        // Fetch available bonds
        fetchAvailableBonds();
      } catch (error) {
        console.error("Authentication error:", error);
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [navigate]);
  
  const fetchAvailableBonds = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/contracts/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch bonds');
      }
      
      const bonds = await response.json();
      setAvailableBonds(bonds);
      
      // Collect unique user IDs from bonds
      const userIds = new Set();
      bonds.forEach(bond => {
        userIds.add(bond.issuer_id);
        userIds.add(bond.buyer_id);
      });
      
      // Fetch user data for each unique ID
      const userDataPromises = Array.from(userIds).map(async id => {
        const userData = await fetchUserData(id);
        return [id, userData];
      });
      
      const userDataEntries = await Promise.all(userDataPromises);
      const userDataMap = Object.fromEntries(userDataEntries);
      setUsers(userDataMap);
    } catch (error) {
      setError(error.message);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBondDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePublishBond = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      // Set status to pending
      setTransactionStatus({
        message: 'Publishing bond...',
        type: 'pending'
      });
      
      // Create a contract with a dummy buyer (will be updated when purchased)
      const response = await fetch(`${process.env.REACT_APP_API_URL}/contracts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          issuer_id: userData.id,
          buyer_id: 0, // Will be updated when someone buys the bond
          comment: bondDetails.comment,
          bond_amount: parseFloat(bondDetails.bond_amount),
          maturity_date: bondDetails.maturity_date,
          yield_rate: parseFloat(bondDetails.yield_rate),
          compliance_status: 'pending',
          metadata: {
            status: 'available',
            published_date: new Date().toISOString()
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to publish bond');
      }
      
      // Clear form and show success message
      setBondDetails({
        bond_amount: '',
        maturity_date: '',
        yield_rate: '',
        comment: ''
      });
      
      setTransactionStatus({
        message: 'Bond published successfully!',
        type: 'success'
      });
      
      // Refresh the list of available bonds
      fetchAvailableBonds();
    } catch (error) {
      setTransactionStatus({
        message: `Error: ${error.message}`,
        type: 'error'
      });
    }
  };
  
  const handleBuyBond = async (bondId) => {
    const token = localStorage.getItem('token');
    
    try {
      // Set status to pending
      setTransactionStatus({
        message: 'Processing purchase...',
        type: 'pending'
      });
      
      // Get the bond details
      const bond = availableBonds.find(b => b.index === bondId);
      
      // Create a new contract with the buyer information
      const response = await fetch(`${process.env.REACT_APP_API_URL}/contracts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          issuer_id: bond.issuer_id,
          buyer_id: userData.id,
          comment: `Purchase of bond #${bondId}: ${bond.comment}`,
          bond_amount: bond.bond_amount,
          maturity_date: bond.maturity_date,
          yield_rate: bond.yield_rate,
          compliance_status: 'pending',
          metadata: {
            status: 'purchased',
            original_bond_id: bondId,
            purchase_date: new Date().toISOString()
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to purchase bond');
      }
      
      setTransactionStatus({
        message: 'Bond purchased successfully!',
        type: 'success'
      });
      
      // Refresh the list of available bonds
      fetchAvailableBonds();
    } catch (error) {
      setTransactionStatus({
        message: `Error: ${error.message}`,
        type: 'error'
      });
    }
  };
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dateString;
  };
  
  // Filter bonds that are available for purchase (those with buyer_id = 0 or metadata.status = 'available')
  const bondsForSale = availableBonds.filter(bond => 
    bond.buyer_id === 0 || 
    (bond.metadata && bond.metadata.status === 'available')
  );
  
  // Filter bonds that the current user has purchased
  const purchasedBonds = userRole === 'buyer' ? availableBonds.filter(bond => 
    bond.buyer_id === userData.id
  ) : [];
  
  // Filter bonds that the current user has issued
  const issuedBonds = userRole === 'issuer' ? availableBonds.filter(bond => 
    bond.issuer_id === userData.id
  ) : [];

  return (
    <div style={{ margin: '20px', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Transaction Portal</h1>
      <p>Welcome, {userData?.username} ({userRole})</p>
      
      {/* Status message */}
      {transactionStatus.message && (
        <div style={{
          padding: '10px',
          margin: '15px 0',
          borderRadius: '5px',
          backgroundColor: 
            transactionStatus.type === 'success' ? '#d4edda' : 
            transactionStatus.type === 'error' ? '#f8d7da' : '#fff3cd',
          color:
            transactionStatus.type === 'success' ? '#155724' : 
            transactionStatus.type === 'error' ? '#721c24' : '#856404'
        }}>
          {transactionStatus.message}
        </div>
      )}
      
      {/* Container for the two portals */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '30px'
      }}>
        {/* Issuer portal */}
        {userRole === 'issuer' && (
          <div style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2>Issuer Portal</h2>
            <p>Publish new green bonds for sale</p>
            
            <form onSubmit={handlePublishBond} style={{ maxWidth: '600px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Bond Amount:
                </label>
                <input
                  type="number"
                  name="bond_amount"
                  value={bondDetails.bond_amount}
                  onChange={handleInputChange}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px',
                    border: '1px solid #ccc' 
                  }}
                  placeholder="Enter amount in USD"
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Maturity Date:
                </label>
                <input
                  type="date"
                  name="maturity_date"
                  value={bondDetails.maturity_date}
                  onChange={handleInputChange}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px',
                    border: '1px solid #ccc' 
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Yield Rate (%):
                </label>
                <input
                  type="number"
                  name="yield_rate"
                  value={bondDetails.yield_rate}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px',
                    border: '1px solid #ccc' 
                  }}
                  placeholder="Annual yield percentage"
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Description:
                </label>
                <textarea
                  name="comment"
                  value={bondDetails.comment}
                  onChange={handleInputChange}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    minHeight: '100px' 
                  }}
                  placeholder="Describe the green bond project"
                />
              </div>
              
              <button 
                type="submit"
                style={{ 
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '10px 15px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Publish Bond
              </button>
            </form>
            
            {/* Display bonds issued by this user */}
            {issuedBonds.length > 0 && (
              <div style={{ marginTop: '30px' }}>
                <h3>Your Issued Bonds</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>ID</th>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Amount</th>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Yield</th>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Maturity</th>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Status</th>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Buyer</th>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuedBonds.map(bond => (
                      <tr key={bond.index} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{bond.index}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>${bond.bond_amount.toFixed(2)}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{bond.yield_rate}%</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{formatDate(bond.maturity_date)}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{bond.compliance_status}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {bond.buyer_id === 0
                            ? 'Available'
                            : users[bond.buyer_id]
                              ? users[bond.buyer_id].username
                              : `User ${bond.buyer_id}`}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '0.85em', fontFamily: 'monospace' }}>
                          {bond.hash
                            ? bond.hash.substring(0, 10) + '...'
                            : 'N/A'}
                          <span title={bond.hash} style={{ cursor: 'help', marginLeft: '3px' }}>ⓘ</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Buyer portal */}
        {userRole === 'buyer' && (
          <div style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2>Buyer Portal</h2>
            <p>Browse and purchase available green bonds</p>
            
            {error && <p style={{ color: 'red' }}>{error}</p>}
            
            {bondsForSale.length === 0 ? (
              <p>No bonds are currently available for sale.</p>
            ) : (
              <div>
                <h3>Available Bonds</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f2f2f2' }}>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>ID</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Issuer</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Amount</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Yield Rate</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Maturity Date</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Description</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bondsForSale.map(bond => (
                        <tr key={bond.index} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{bond.index}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                            {users[bond.issuer_id]
                              ? users[bond.issuer_id].username
                              : `Issuer #${bond.issuer_id}`}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>${bond.bond_amount.toFixed(2)}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{bond.yield_rate}%</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{formatDate(bond.maturity_date)}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{bond.comment}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                            <button
                              onClick={() => handleBuyBond(bond.index)}
                              style={{ 
                                backgroundColor: '#007bff',
                                color: 'white',
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Pay with PSE
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Display bonds purchased by this user */}
            {purchasedBonds.length > 0 && (
              <div style={{ marginTop: '30px' }}>
                <h3>Your Purchased Bonds</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>ID</th>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Issuer</th>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Amount</th>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Yield</th>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Maturity</th>
                      <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchasedBonds.map(bond => (
                      <tr key={bond.index} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{bond.index}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                          {users[bond.issuer_id]
                            ? users[bond.issuer_id].username
                            : `Issuer #${bond.issuer_id}`}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>${bond.bond_amount.toFixed(2)}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{bond.yield_rate}%</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{formatDate(bond.maturity_date)}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{bond.compliance_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProtectedPage;
