import React from 'react';
import styled from 'styled-components';

const TimelineContainer = styled.div`
  margin: 20px 0;
  padding: 20px;
  background-color: #f8fafb;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const TimelineHeader = styled.h2`
  margin-bottom: 15px;
  color: #2e7d32;
`;

const TimelineDescription = styled.p`
  margin-bottom: 20px;
  color: #555;
`;

const TimelineList = styled.ul`
  list-style-type: none;
  padding: 0;
  position: relative;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 20px;
    height: 100%;
    width: 4px;
    background-color: #4CAF50;
    border-radius: 2px;
  }
`;

const TimelineItem = styled.li`
  position: relative;
  margin-bottom: 30px;
  padding-left: 60px;
  
  &:before {
    content: '';
    position: absolute;
    top: 5px;
    left: 12px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: ${props => 
      props.$status === 'compliant' ? '#4CAF50' : 
      props.$status === 'non_compliant' ? '#f44336' : 
      props.$status === 'under_review' ? '#FFC107' : '#2196F3'};
    box-shadow: 0 0 0 4px #e8f5e9;
    z-index: 1;
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const TimelineDate = styled.div`
  font-size: 0.85rem;
  color: #777;
  margin-bottom: 5px;
`;

const TimelineTitle = styled.h3`
  margin: 0 0 10px;
  color: #333;
  font-size: 1.2rem;
`;

const TimelineContent = styled.div`
  background-color: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  margin-left: 10px;
  background-color: ${props => 
    props.$status === 'compliant' ? '#e8f5e9' : 
    props.$status === 'non_compliant' ? '#ffebee' : 
    props.$status === 'under_review' ? '#fff8e1' : '#e3f2fd'};
  color: ${props => 
    props.$status === 'compliant' ? '#2e7d32' : 
    props.$status === 'non_compliant' ? '#c62828' : 
    props.$status === 'under_review' ? '#ff8f00' : '#1565c0'};
`;

const Detail = styled.div`
  display: flex;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.span`
  flex: 0 0 120px;
  font-weight: 500;
  color: #555;
`;

const Value = styled.span`
  flex: 1;
  word-break: break-word;
`;

const HashValue = styled.span`
  font-family: monospace;
  font-size: 0.9em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  display: inline-block;
  cursor: help;
`;

const TransactionTimeline = ({ transactions, users }) => {
  // Sort transactions by timestamp (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  return (
    <TimelineContainer>
      <TimelineHeader>Transaction Timeline</TimelineHeader>
      <TimelineDescription>
        A chronological view of all bond transactions in the blockchain
      </TimelineDescription>
      
      <TimelineList>
        {sortedTransactions.map(tx => (
          <TimelineItem key={tx.index} $status={tx.compliance_status}>
            <TimelineDate>{formatDate(tx.timestamp)}</TimelineDate>
            
            <TimelineTitle>
              Bond #{tx.index}
              <StatusBadge $status={tx.compliance_status}>
                {tx.compliance_status.replace('_', ' ')}
              </StatusBadge>
            </TimelineTitle>
            
            <TimelineContent>
              <Detail>
                <Label>Issuer:</Label>
                <Value>
                  {users[tx.issuer_id] 
                    ? users[tx.issuer_id].username 
                    : `User ${tx.issuer_id}`}
                </Value>
              </Detail>
              
              <Detail>
                <Label>Buyer:</Label>
                <Value>
                  {tx.buyer_id === 0
                    ? "Available for purchase"
                    : users[tx.buyer_id]
                      ? users[tx.buyer_id].username
                      : `User ${tx.buyer_id}`}
                </Value>
              </Detail>
              
              <Detail>
                <Label>Bond Amount:</Label>
                <Value>{formatCurrency(tx.bond_amount)}</Value>
              </Detail>
              
              {tx.maturity_date && (
                <Detail>
                  <Label>Maturity Date:</Label>
                  <Value>{tx.maturity_date}</Value>
                </Detail>
              )}
              
              {tx.yield_rate && (
                <Detail>
                  <Label>Yield Rate:</Label>
                  <Value>{tx.yield_rate}%</Value>
                </Detail>
              )}
              
              {tx.hash && (
                <Detail>
                  <Label>Transaction:</Label>
                  <Value>
                    <HashValue title={tx.hash}>
                      {tx.hash.substring(0, 16)}...
                    </HashValue>
                  </Value>
                </Detail>
              )}
              
              {tx.comment && (
                <Detail>
                  <Label>Comment:</Label>
                  <Value>{tx.comment}</Value>
                </Detail>
              )}
              
              {tx.compliance_history && tx.compliance_history.length > 0 && (
                <Detail>
                  <Label>History:</Label>
                  <Value>
                    {tx.compliance_history.map((entry, idx) => (
                      <div key={idx} style={{ fontSize: '0.9em', marginBottom: '5px' }}>
                        {entry.timestamp.substring(0, 10)} - Status changed to{' '}
                        <strong>{entry.new_status.replace('_', ' ')}</strong>
                        {entry.reason && <em> (Reason: {entry.reason})</em>}
                      </div>
                    ))}
                  </Value>
                </Detail>
              )}
            </TimelineContent>
          </TimelineItem>
        ))}
      </TimelineList>
    </TimelineContainer>
  );
};

export default TransactionTimeline;