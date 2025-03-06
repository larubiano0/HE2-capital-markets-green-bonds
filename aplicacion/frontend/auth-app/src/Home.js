import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import TransactionGraph from './components/visualizations/TransactionGraph';
import TransactionTimeline from './components/visualizations/TransactionTimeline';

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
`;

const Tab = styled.div`
  padding: 10px 20px;
  cursor: pointer;
  background-color: ${props => props.$active ? '#e8f5e9' : 'transparent'};
  border-bottom: 3px solid ${props => props.$active ? '#4CAF50' : 'transparent'};
  font-weight: ${props => props.$active ? 'bold' : 'normal'};
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.$active ? '#e8f5e9' : '#f5f5f5'};
  }
`;

function HomePage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState({});
  const [activeTab, setActiveTab] = useState('table');
  
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
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        // Check if user is authenticated (but don't require it for data)
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);
        
        // Fetch transactions from public endpoint
        const response = await fetch(`${process.env.REACT_APP_API_URL}/contracts/public`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch blockchain transactions');
        }
        
        const data = await response.json();
        setTransactions(data);
        
        // Collect unique user IDs from transactions
        const userIds = new Set();
        data.forEach(tx => {
          userIds.add(tx.issuer_id);
          userIds.add(tx.buyer_id);
        });
        
        // Fetch user data for each unique ID
        const userDataPromises = Array.from(userIds).map(async id => {
          const userData = await fetchUserData(id);
          return [id, userData];
        });
        
        const userDataEntries = await Promise.all(userDataPromises);
        const userDataMap = Object.fromEntries(userDataEntries);
        setUsers(userDataMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, []);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dateString;
  };
  
  // Function to render the table view
  const renderTableView = () => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}>
        <thead>
          <tr style={{
            backgroundColor: '#f2f2f2',
            borderBottom: '2px solid #ddd'
          }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Timestamp</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Issuer</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Buyer</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Bond Amount</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Maturity Date</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Yield Rate</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Comment</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Transaction Hash</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.index} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px' }}>{tx.index}</td>
              <td style={{ padding: '10px' }}>{tx.timestamp}</td>
              <td style={{ padding: '10px' }}>
                {users[tx.issuer_id] ? users[tx.issuer_id].username : `User ${tx.issuer_id}`}
              </td>
              <td style={{ padding: '10px' }}>
                {tx.buyer_id === 0
                  ? "Available"
                  : users[tx.buyer_id]
                    ? users[tx.buyer_id].username
                    : `User ${tx.buyer_id}`}
              </td>
              <td style={{ padding: '10px' }}>${tx.bond_amount.toFixed(2)}</td>
              <td style={{ padding: '10px' }}>{formatDate(tx.maturity_date)}</td>
              <td style={{ padding: '10px' }}>
                {tx.yield_rate ? `${tx.yield_rate}%` : 'N/A'}
              </td>
              <td style={{ padding: '10px' }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.85em',
                  backgroundColor:
                    tx.compliance_status === 'compliant' ? '#d4edda' :
                    tx.compliance_status === 'non_compliant' ? '#f8d7da' :
                    tx.compliance_status === 'under_review' ? '#fff3cd' : '#e2e3e5',
                  color:
                    tx.compliance_status === 'compliant' ? '#155724' :
                    tx.compliance_status === 'non_compliant' ? '#721c24' :
                    tx.compliance_status === 'under_review' ? '#856404' : '#383d41'
                }}>
                  {tx.compliance_status.replace('_', ' ')}
                </span>
              </td>
              <td style={{ padding: '10px' }}>{tx.comment}</td>
              <td style={{ padding: '10px', fontSize: '0.85em', fontFamily: 'monospace' }}>
                {tx.hash ? tx.hash.substring(0, 10) + '...' : 'N/A'}
                <span title={tx.hash} style={{ cursor: 'help', marginLeft: '3px' }}>ⓘ</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Function to render the content based on activeTab
  const renderContent = () => {
    if (loading) {
      return <p>Loading transactions...</p>;
    }
    
    if (error) {
      return (
        <div style={{ color: 'red' }}>
          <p>Error: {error}</p>
          <p>Please make sure the backend server is running.</p>
        </div>
      );
    }
    
    if (transactions.length === 0) {
      return <div><p>No transactions available. The blockchain has no records yet.</p></div>;
    }
    
    switch (activeTab) {
      case 'graph':
        return <TransactionGraph transactions={transactions} users={users} />;
      case 'timeline':
        return <TransactionTimeline transactions={transactions} users={users} />;
      case 'table':
      default:
        return renderTableView();
    }
  };

  return (
    <div style={{
      margin: '20px',
      backgroundColor: '#e8f5e9',
      padding: '20px',
      borderRadius: '8px',
      minHeight: '100vh'
    }}>
      <h1>Latest Green Bonds Blockchain Transactions</h1>
      
      <div style={{
        marginTop: '15px',
        textAlign: 'right',
        padding: '8px 15px',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: '5px',
        display: 'inline-block',
        float: 'right',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        Already have an account? <Link to="/login" style={{
          fontWeight: 'bold',
          color: '#2e7d32',
          textDecoration: 'none'
        }}>Log in</Link>
      </div>
      
      <div style={{ clear: 'both' }}></div>
      
      {!loading && !error && transactions.length > 0 && (
        <TabContainer>
          <Tab
            $active={activeTab === 'table'}
            onClick={() => setActiveTab('table')}
          >
            Table View
          </Tab>
          <Tab
            $active={activeTab === 'graph'}
            onClick={() => setActiveTab('graph')}
          >
            Network Graph
          </Tab>
          <Tab
            $active={activeTab === 'timeline'}
            onClick={() => setActiveTab('timeline')}
          >
            Timeline
          </Tab>
        </TabContainer>
      )}
      
      {renderContent()}
    </div>
  );
}

export default HomePage;