import { Button, Card, Result, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { copy } from '../config/copy';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Card>
      <Result
        status="404"
        title={<Typography.Title level={1} style={{ margin: 0, fontSize: 24 }}>{copy.errors.title404}</Typography.Title>}
        subTitle={copy.errors.subtitle404}
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            {copy.errors.dashboard}
          </Button>
        }
      />
    </Card>
  );
}
